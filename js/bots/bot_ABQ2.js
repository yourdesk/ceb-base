window.thoughts_elem = $("#thoughts");
let q_count = 0;
let ab_count = 0;

const bot_abq2 = (function(root_depth) {

    const piece_values = {
        'p': 100,
        'r': 500,
        'n': 300,
        'b': 315,
        'q': 900,
        'k': 1000000
    };

    const piece_square_tables = {  // Example piece-square tables (adjust as needed)
        'p': [
             0,  0,  0,  0,  0,  0,  0,  0,
            50, 50, 50, 50, 50, 50, 50, 50,
            10, 10, 20, 30, 30, 20, 10, 10,
             5,  5, 10, 25, 25, 10,  5,  5,
             0,  0,  0, 20, 20,  0,  0,  0,
             5, -5,-10,  0,  0,-10, -5,  5,
             5, 10, 10,-20,-20, 10, 10,  5,
             0,  0,  0,  0,  0,  0,  0,  0
        ],
        'n': [
            -50,-40,-30,-30,-30,-30,-40,-50,
            -40,-20,  0,  0,  0,  0,-20,-40,
            -30,  0, 10, 15, 15, 10,  0,-30,
            -30,  5, 15, 20, 20, 15,  5,-30,
            -30,  0, 15, 20, 20, 15,  0,-30,
            -30,  5, 10, 15, 15, 10,  5,-30,
            -40,-20,  0,  5,  5,  0,-20,-40,
            -50,-40,-30,-30,-30,-30,-40,-50,
        ],
        'b': [
            -20,-10,-10,-10,-10,-10,-10,-20,
            -10,  0,  0,  0,  0,  0,  0,-10,
            -10,  0,  5, 10, 10,  5,  0,-10,
            -10,  5,  5, 10, 10,  5,  5,-10,
            -10,  0, 10, 10, 10, 10,  0,-10,
            -10, 10, 10, 10, 10, 10, 10,-10,
            -10,  5,  0,  0,  0,  0,  5,-10,
            -20,-10,-10,-10,-10,-10,-10,-20,
        ],
        'r': [
            0,  0,  0,  0,  0,  0,  0,  0,
            5, 10, 10, 10, 10, 10, 10,  5,
           -5,  0,  0,  0,  0,  0,  0, -5,
           -5,  0,  0,  0,  0,  0,  0, -5,
           -5,  0,  0,  0,  0,  0,  0, -5,
           -5,  0,  0,  0,  0,  0,  0, -5,
           -5,  0,  0,  0,  0,  0,  0, -5,
            0,  0,  0,  5,  5,  0,  0,  0
        ],
        'q': [
            -20,-10,-10, -5, -5,-10,-10,-20,
            -10,  0,  0,  0,  0,  0,  0,-10,
            -10,  0,  5,  5,  5,  5,  0,-10,
             -5,  0,  5,  5,  5,  5,  0, -5,
              0,  0,  5,  5,  5,  5,  0, -5,
            -10,  5,  5,  5,  5,  5,  0,-10,
            -10,  0,  5,  0,  0,  0,  0,-10,
            -20,-10,-10, -5, -5,-10,-10,-20
        ],
        'k': [
            -50,-40,-30,-20,-20,-30,-40,-50,
            -30,-20,-10,  0,  0,-10,-20,-30,
            -30,-10, 20, 30, 30, 20,-10,-30,
            -30,-10, 30, 40, 40, 30,-10,-30,
            -30,-10, 30, 40, 40, 30,-10,-30,
            -30,-10, 20, 30, 30, 20,-10,-30,
            -30,-30,  0,  0,  0,  0,-30,-30,
            -50,-30,-30,-30,-30,-30,-30,-50
        ]
        // Add tables for other pieces ('r', 'n', 'b', 'q', 'k')
    };

    function piece_value(piece, square) 
    {
        if (piece === null) {
            return 0;
        }
        let value = piece_values[piece.type];
        if(piece.color === 'w')
            value += piece_square_tables[piece.type][square];
        else
            value -= piece_square_tables[piece.type][square];

        return piece.color === 'w' ? value : -value;
    }

    function calculate_material(game) {
        let ev = 0;
        const pieces = game.board(); // Get the board only once
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = pieces[i][j]; // Access piece directly
                ev += piece_value(piece, i * 8 + j);
            }
        }
        return ev;
    }

    function is_capture_or_promotion_or_check(move, game) {
        return move.captured !== undefined || move.flags.includes('p') || game.in_check();
    }

    function quiesce(game, alpha, beta) {
        q_count++;

        const stand_pat = calculate_material(game);

        if (stand_pat >= beta) {
            return beta;
        }
        alpha = Math.max(alpha, stand_pat); // Update alpha efficiently


        const moves = game.moves({ verbose: true }).filter( move => 
            is_capture_or_promotion_or_check(move, game)
        ); // Filter captures *before* iterating


        for (const move of moves) {
            game.move(move);
            const score = -quiesce(game, -beta, -alpha);
            game.undo();

            if (score >= beta) {
                return beta;
            }
            alpha = Math.max(alpha, score); // Update alpha efficiently
        }

        return alpha;
    }

    function alphabeta(game, depth, side, alpha, beta, root_depth) {
        ab_count++;
        if (depth === 0) {
            return quiesce(game, alpha, beta);
        }


        let best_value = -Infinity;
        let moves = game.moves({ verbose: true });

        if (moves.length === 0) {
            return game.in_checkmate() ? -600000 + (root_depth - depth) : 0;
        }

        // MVV-LVA Sorting (remains unchanged)
        moves.sort((a, b) => {
            const capturedA = a.captured ? piece_values[a.captured] : 0;
            const capturedB = b.captured ? piece_values[b.captured] : 0;
            const pieceA = piece_values[a.piece];
            const pieceB = piece_values[b.piece];
            return (capturedB - pieceA) - (capturedA - pieceB);
        });

        let best_move = null;

        for (const move of moves) {
            game.move(move);
            let score = -alphabeta(game, depth - 1, -side, -beta, -alpha, root_depth);
            
            if (game.in_draw())
            {
                score = -100000;
            }

            game.undo();
            
            if (score > best_value) {
                best_value = score;
                best_move = move;
                if (score > alpha) {
                    alpha = score;
                }

                if (depth === root_depth) {
                    thoughts_elem.html(
                        `new best move ${move.san} with score ${score}<br>` + // Use .san directly
                        `q_count: ${q_count}, ab_count: ${ab_count}`
                    );
                    best_move_sf = move.san;
                }
            }

            if (score >= beta) {
                return best_value;
            }
        }

        return best_value;
    }


    const calc_func = function(game, side) {
        q_count = 0;
        ab_count = 0;
        best_move_sf = null; // Reset best move
        alphabeta(game, root_depth, side, -Infinity, Infinity, root_depth);
        return best_move_sf;
    };

    return calc_func;
});
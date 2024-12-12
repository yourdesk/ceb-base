let q_count = 0;
let ab_count = 0;
let tt = {}; // Transposition table

const bot_abq3 = (function(root_depth) {

    const piece_values = {
        'p': 100, 'r': 500, 'n': 320, 'b': 330, 'q': 900, 'k': 100000
    };

    const piece_square_tables = { 
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
    };

    const side_mult = {
        'w': 1,
        'b': -1
    }

    function piece_value(piece, square) 
    {
        if (piece == null) return 0;

        let value = piece_values[piece.type];

        value += piece_square_tables[piece.type][square] * side_mult[piece.color];

        return value * side_mult[piece.color];
    }

    function evaluate(game) 
    {
        let material = 0;
        let board = game.board(); 
        for (let i = 0; i < 8; i++) 
        {
            for (let j = 0; j < 8; j++) 
            {
                material += piece_value(board[i][j], i * 8 + j);
            }
        }
        return material + (game.in_check() ? 20 : 0);
    }

    function is_quiet(move)
    {
        return move.captured === undefined && !move.flags.includes('p') && !game.in_check();
    }

    function quiesce(game, alpha, beta) 
    {
        q_count++;
        const stand_pat = evaluate(game);

        if (stand_pat >= beta) return beta;
        if(alpha < stand_pat) alpha = stand_pat;

        const moves = game.moves({ verbose: true }).sort((a, b) => { // Sort captures first
            const capturedA = a.captured ? piece_values[a.captured] : 0;
            const capturedB = b.captured ? piece_values[b.captured] : 0;
            return capturedB - capturedA;
        }).filter(move => !is_quiet(move));

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            game.move(move);
            const score = -quiesce(game, -beta, -alpha);
            game.undo();
            if (score >= beta) return beta;
            if(alpha < score) alpha = score;
        }
        return alpha;
    }


    function pvs(game, depth, alpha, beta, root_depth) { // PVS function
        ab_count++;

        let alphaOrig = alpha;

        let ttEntry = tt[game.fen()];
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === 'exact') return ttEntry.value;
            else if (ttEntry.flag === 'lowerbound') alpha = Math.max(alpha, ttEntry.value);
            else if (ttEntry.flag === 'upperbound') beta = Math.min(beta, ttEntry.value);

            if (alpha >= beta) return ttEntry.value;
        }

        if (depth === 0) return quiesce(game, alpha, beta);

        let moves = game.moves({ verbose: true });

        if (moves.length === 0) {
            return game.in_checkmate() ? -piece_values['k'] + (root_depth - depth) : 0;
        }

        moves.sort((a, b) => { // MVV-LVA sorting
            const capturedA = a.captured ? piece_values[a.captured] : 0;
            const capturedB = b.captured ? piece_values[b.captured] : 0;
            const pieceA = piece_values[a.piece];
            const pieceB = piece_values[b.piece];
            return (capturedB - pieceA) - (capturedA - pieceB);
        });

        let best_score = -Infinity;
        let best_move = null;

        let first_move = true;
        for (const move of moves) {
            game.move(move);

            let score;
            if (first_move) {

                score = -pvs(game, depth - 1, -beta, -alpha, root_depth);
            }
            else
            {
                score = -pvs(game, depth - 1, -alpha-1, -alpha, root_depth);
                if (alpha < score && score < beta)
                {
                    score = -pvs(game, depth-1, -beta, -score, root_depth);
                }

            }

            game.undo();

            if (game.in_draw())
            {
                score = 0;
            }

            if (score > best_score) {
                best_score = score;
                best_move = move;
                if (score > alpha) {
                    alpha = score;
                }
            }

            if (alpha >= beta) {
                break; // Beta cutoff
            }
            first_move = false;

        }


        // Transposition table store
        ttEntry = {};
        ttEntry.value = best_score;
        if (best_score <= alphaOrig) ttEntry.flag = 'upperbound';
        else if (best_score >= beta) ttEntry.flag = 'lowerbound';
        else ttEntry.flag = 'exact';
        ttEntry.depth = depth;
        tt[game.fen()] = ttEntry;


        if(depth === root_depth)
        {
            return best_move ? best_move.san : null;
        }
        else
        {
            return best_score;
        }
    }

    const calc_func = function(game) { // Use PVS in calc_func
        q_count = 0;
        ab_count = 0;
        tt = {}; // Clear transposition table on each new search
        return pvs(game, root_depth, -Infinity, Infinity, root_depth); // Call PVS
    };

    return calc_func;
});
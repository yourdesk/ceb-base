let q_count = 0;
let ab_count = 0;
let tt = {}; // Transposition table
window.thoughts_elem = $("#thoughts");
const bot_negamax2 = (function(root_depth) {

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

    function evaluate(game, cur_depth, side) 
    {
        let board = game.board(); 
        
        if (game.in_checkmate())
            return -1000000 - cur_depth;

        if (game.in_draw())
            return 0;

        let material = 0;
        for (let i = 0; i < 8; i++) 
        {
            for (let j = 0; j < 8; j++) 
            {
                material += piece_value(board[i][j], i * 8 + j);
            }
        }

        return material * side;
    }

    function is_quiet(move)
    {
        return move.captured === undefined && !move.flags.includes('p') && !game.in_check();
    }

    function quiesce(game, alpha, beta, side, cur_depth) 
    {
        const stand_pat = evaluate(game, cur_depth, side);

        if (stand_pat >= beta) return beta;
        alpha = Math.max(alpha, stand_pat);

        const moves = game.moves({ verbose: true }).sort((a, b) => { // Sort captures first
            const capturedA = a.captured ? piece_values[a.captured] : 0;
            const capturedB = b.captured ? piece_values[b.captured] : 0;
            return capturedB - capturedA;
        }).filter(move => !is_quiet(move));

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            game.move(move);
            const score = -quiesce(game, -beta, -alpha, -side, cur_depth - 1);
            game.undo();
            if (score >= beta) return beta;
            alpha = Math.max(alpha, score);
        }
        return alpha;
    }

    let best_move_sf = null;

    function negamax(game, side, cur_depth, alpha, beta)
    {
        if (game.in_checkmate() || game.in_draw())
            return evaluate(game, cur_depth, side);

        if (cur_depth == 0)
            return quiesce(game, alpha, beta, side, cur_depth);

        let moves = game.moves({ verbose: true });

        moves.sort((a, b) => { // MVV-LVA sorting
            const capturedA = a.captured ? piece_values[a.captured] : 0;
            const capturedB = b.captured ? piece_values[b.captured] : 0;
            const pieceA = piece_values[a.piece];
            const pieceB = piece_values[b.piece];
            return (capturedB - pieceA) - (capturedA - pieceB);
        });

        for (let i = 0; i < moves.length; i++)
        {
            let move = moves[i];
            game.move(move);
            let eval = -negamax(game, -side, cur_depth - 1, -beta, -alpha);
            game.undo();

            if (eval >= beta)
                return beta;

            if (eval > alpha)
            {
                alpha = eval;
                if (cur_depth == root_depth)
                {
                    best_move_sf = move;
                    thoughts_elem.html(`new best move ${JSON.stringify(move)} with score ${eval} (${alpha}, ${beta})`);
                }
            }
        }

        return alpha;
    }

    const calc_func = function(game, side) {
        negamax(game, side, root_depth, -Infinity, Infinity);

        return best_move_sf;
    };

    return calc_func;
});
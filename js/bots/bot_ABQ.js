window.thoughts_elem = $("#thoughts");
let q_count = 0;
let ab_count = 0;
const bot_abq = (function(){
    function calculate_material(board) {
        let ev = 0;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                ev += piece_value(board[i][j]);
            }
        }
        return ev;
    }
    
    let piece_values = {
        'p': 100,
        'r': 500,
        'n': 300,
        'b': 315,
        'q': 900,
        'k': 1000000
    }
    
    function piece_value(piece) 
    {
        if (piece === null) {
            return 0;
        }
    
        let absoluteValue = piece_values[piece.type];
        return piece.color === 'w' ? absoluteValue : -absoluteValue;
    }

    function capturing_moves(game)
    {
        const all_moves = game.moves({ verbose: true });
        const capturing_moves = all_moves.filter(
            move => move.captured !== undefined // Correctly check for captures
        )

        return capturing_moves;
    }
    
    function quiesce(game, alpha, beta)
    {
        q_count++;
        let stand_pat = calculate_material(game.board());
        if (stand_pat >= beta) // >= to avoid failing to prune
            return beta;

        if (alpha < stand_pat)
            alpha = stand_pat

        let moves = capturing_moves(game);

        for (let i = 0; i < moves.length; i++)
        {
            let new_game_move = moves[i];
            game.move(new_game_move);
            let score = -quiesce(game, -beta, -alpha);
            game.undo();

            if (score >= beta)
                return beta;
            if (score > alpha)
                alpha = score;
        }

        return alpha;
    }

    let best_move_sf = null;
    function alphabeta(game, depth, side, alpha, beta) {
        ab_count++;
        if (depth == 0) return quiesce(game, alpha, beta);
        
        let best_value = -Infinity;
        let moves = game.moves();
    
        if (moves.length === 0) {
            if (game.in_checkmate()) {
                return -600000 + (2-depth); // Mate score depends on depth.  Lower depth means sooner mate = better.
            } else {
                return 0; // Stalemate
            }
        }
    
        for (let i = 0; i < moves.length; i++) {
            let new_game_move = moves[i];
            game.move(new_game_move);
    
            let score = -alphabeta(game, depth - 1, -side, -beta, -alpha); // Fixed alpha-beta order
            game.undo();
    
            if (score > best_value) {
                best_value = score;
                if (score > alpha)
                    alpha = score;

                if (depth === 2) { // Store best move at root level
                    thoughts_elem.html(
                        `new best move ${new_game_move} with score ${score}<br>` +
                        `q_count: ${q_count}, ab_count: ${ab_count}`
                    );
                    best_move_sf = new_game_move;
                }
            }

            if (score >= beta) // Check against beta
                return best_value;
        }
    
        return best_value;
    }

    const calc_func = function (game, side)
    {
        q_count = 0;
        ab_count = 0;
        alphabeta(game, 2, side, -Infinity, Infinity); // Initialize alpha and beta correctly
    
        return best_move_sf;
    }

    return calc_func;
})();
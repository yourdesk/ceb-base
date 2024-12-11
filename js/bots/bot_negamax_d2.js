window.thoughts_elem = $("#thoughts");
const negamax_d2 = (function(){
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
    
    let best_move_sf = null;
    function negamax(game, depth, side) {
        if (depth === 0) {
            return side * calculate_material(game.board());
        }
    
        let max = -Infinity;
        let moves = game.moves();
    
        if (moves.length === 0) {
            return -Infinity; // Checkmate or stalemate
        }
    
        for (let i = 0; i < moves.length; i++) {
            let new_game_move = moves[i];
            game.move(new_game_move);
    
            let val = -negamax(game, depth - 1, -side);
            game.undo();
    
            if (val > max) {
                max = val;
                if (depth === 2) { // Store best move at root level
                    thoughts_elem.html(`new best move ${new_game_move} with score ${val}`);
                    best_move_sf = new_game_move;
                }
            }
        }
    
        return max;
    }

    const calc_func = function (game, side)
    {
        negamax(game, 2, side);
    
        return best_move_sf;
    }

    return calc_func;
})();

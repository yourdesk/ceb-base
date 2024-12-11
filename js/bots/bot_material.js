const bot_material = (function(){
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
    
    const calc_func = function (game, side)
    {
        // generate all moves
        let new_moves = game.moves();
        let best_move = null;
        let best_val = -Infinity;
    
        for (let i = 0; i < new_moves.length; i++)
        {
            let new_game_move = new_moves[i];
            game.move(new_game_move);
            let val = side * calculate_material(game.board());
            game.undo();
            if (val > best_val)
            {
                best_move = new_game_move;
                best_val = val;
            }
        }
    
        return best_move;
    }

    return calc_func;
})();

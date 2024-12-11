let board = null;
let game = new Chess();
let status_elem = $("#status");
let fen_elem = $("#fen");
let pgn_elem = $("#pgn");

function on_drag_start(source, piece, position, orientation)
{
    if (game.game_over()) return false;

    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1))
    {
        return false;
    }
}

function on_drop(source, target)
{
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';

    update_status()

    setTimeout(() => {
        bot_move(500);
    }, 500);
}

function on_snap_end()
{
    board.position(game.fen());
}

function bot_move(think_time)
{
    let best_move = calculate_best_move(game);
    game.move(best_move);
    board.position(game.fen());

    update_status();
}

function calculate_best_move(game)
{
    // generate all moves
    let new_moves = game.moves();
    return new_moves[Math.floor(Math.random() * new_moves.length)];
}

function update_status()
{
    console.log('status updated');
    let status = '';
    let move_color = 'White';
    if (game.turn() === 'b')
        move_color = 'Black';

    if (game.in_checkmate())
        status = 'Game over, ' + move_color + ' is in checkmate.';
    else if (game.in_draw())
        status = 'Game over, drawn position';
    else
    {
        status = move_color + ' to move';

        if (game.in_check())
            status += ', ' + move_color + ' is in check';
    }

    status_elem.html(status);
    fen_elem.html(game.fen());
    pgn_elem.html(game.pgn());
}

let config = {
    draggable: true,
    position: 'start',
    onDragStart: on_drag_start,
    onDrop: on_drop,
    onSnapEnd: on_snap_end
};

board = Chessboard('board', config);

update_status();
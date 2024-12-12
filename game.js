const delay = ms => new Promise(res => setTimeout(res, ms));

let board = null;
let game = new Chess();
let status_elem = $("#status");
let fen_elem = $("#fen");
let pgn_elem = $("#pgn");

// const b1_bestmove = function (game, side) { return 0; };
// const b2_bestmove = function (game, side) { return 0; };

function load_bot(name)
{
    let script_elem = $("<script>", {src: name});
    $(document.body).append(script_elem);
}

// set this to false if you want to play one of the bots yourself
const BOT_FIGHT = true;

function update_status()
{
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
    console.log('status updated');
}

const fight_think_time = 250;

let bot_order = [bot_negamax2(2), bot_negamax2(3)];
let order_side = {1: 0, [-1]: 1}; // laziness
let side = 1;
async function bot_fight()
{
    while (!game.game_over())
    {
        let best_move = bot_order[order_side[side]](game, side);
        game.move(best_move);
        board.position(game.fen(), false);
        update_status();
        side = -side;
        await delay(fight_think_time);
    }
}

let config = {
    draggable: false,
    position: 'start',
    moveSpeed: 0,
    appearSpeed: 0
};

board = Chessboard('board', config);

let start_btn = $("<button>", {id: "start"});
start_btn.html('Start the fight!');
start_btn.click(function()
{
    bot_fight();
    this.remove();
});

$("main").append(start_btn);
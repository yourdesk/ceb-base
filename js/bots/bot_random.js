function bot_random(game, side)
{
    // generate all moves
    let new_moves = game.moves();
    return new_moves[Math.floor(Math.random() * new_moves.length)];
}

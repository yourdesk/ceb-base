function bot_random(side)
{
    // generate all moves
    let new_moves = game.moves();
    return new_moves[Math.floor(Math.random() * new_moves.length)];
}

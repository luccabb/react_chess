# React Chess AI

The algorithm for the AI is a minimax with alpha-beta pruning (based on Russell & Norvig (2010)), since the search space for chess is really big the AI needs to do a depth limited search, where it will only look a few movements ahead and try to evaluate each possible board position with an evaluation function that attributes different score for different boards, and it will prune branches as much as it can (so it doesn’t look at paths that won’t affect the ‘best move’). Since all the processing is being done on the client side we cannot go very deep into the decision tree since it will start taking a long time for the AI to move its pieces, so to ensure minimum delay for the user my AI is using a depth of 2. Since we cannot go very deep into the movements we need to create a good evaluation function that accounts for different things that are considered important in chess. This way even though our AI can only look 2 depths ahead it will be able to take a few key parameters into account.

## Getting started

To get started with the app, clone the repo and then follow the instructions to initialize it:

Change Directory and Install dependencies

```
$ cd react_chess
$ npm install
```

Run the app in a local server:

```
$ npm run start
```

## Build With

* [React](https://reactjs.org/) - Web framework
* [chessboardjsx](https://github.com/willb335/chessboardjsx) - Chessboard built for React
* [chess.js](https://github.com/willb335/chessboardjsx) - A Javascript chess library for chess move generation/validation, piece placement/movement, and check/checkmate/draw detection


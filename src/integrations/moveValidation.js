import React, { Component } from "react";
import PropTypes from "prop-types";
// import { Chess } from "chess.js"; // import Chess from  "chess.js"(default) if recieving an error about new Chess() not being a constructor
import Chess from  "chess.js"
import cloneDeep from 'lodash/cloneDeep'
import Chessboard from "chessboardjsx";
import { roleElements } from "aria-query";


class HumanVsHuman extends Component {
    static propTypes = { children: PropTypes.func };
  
    state = {
      fen: "start",
      // square styles for active drop square
      dropSquareStyle: {},
      // custom square styles
      squareStyles: {},
      // square with the currently clicked piece
      pieceSquare: "",
      // currently clicked square
      square: "",
      // array of past game moves
      history: [],
      gameOver: false,
      playerLost: true,
      round: 0
    };

    boardValue=(board, player)=>{
      // assign a value to the current board that it receives (evaluation function)
      const pieceValues = {
        'q': 27,
        'p': 2,
        'n': 8,
        'b': 13,
        'r': 14,
        'k': 1000,
      }
      var totalValue = 0;

      const centerRows = [3, 4]
      const centerColumns = [0,1,2,3,4,5,6,7]
      const queenRow = 7
      const queenCol = 3

      const knightRow = 7
      const leftKnightCol = 1
      const rightKnightCol = 6

      const bishopRow = 7
      const leftBishopCol = 2
      const rightBishopCol = 5

      const corners = [(0,0), (0,1), (1,0), (1,1), (0,7), (0,6), (1,7), (1,6), (6,6), (6,7), (7,6), (7,7), (6,0), (6,1), (7,1), (7,0)]

      var blackPieces = 0
      var whitePieces = 0

      board.forEach((row, r)=>{
        row.forEach((piece, i)=>{
          if (piece && piece['color'] === 'b'){
            blackPieces += 1
          } else if (piece && piece['color'] === 'w'){
            whitePieces += 1
          }
        })
      })

      board.forEach((row, r)=>{
        row.forEach((piece, i)=>{

          
          if (piece && piece['type'] in pieceValues){
            // adding to totalValue the value coming from black pieces.
            // When the black is evaluating it will try to find the highest possible totalValue
            // in this case meaning that it has more black pieces in the table and less white pieces
            if (piece['color'] == 'b'){
              totalValue += pieceValues[piece['type']]
            } else {
              totalValue -= pieceValues[piece['type']]
            }

            // lose points for 2 pawns in the same column
            if (piece['type'] == 'p' && piece['color'] == 'b'){
              var pawnInRow = 0

              for( var j =0; j<= 7; j++) {
                var pieceHelper = board[j][i]
                if (pieceHelper && pieceHelper['type'] == 'p' && pieceHelper['color'] == 'b'){
                  pawnInRow += 1
                }
              }

              if (pawnInRow >= 2){
                totalValue -= 0.5*pawnInRow
              }
              
            } else if (piece['type'] == 'p' && piece['color'] == 'w'){
              var pawnInRow = 0

              for( var j =0; j<= 7; j++) {
                var pieceHelper = board[j][i]
                if (pieceHelper && pieceHelper['type'] == 'p' && pieceHelper['color'] == 'w'){
                  pawnInRow += 1
                }
              }

              if (pawnInRow >= 2){
                totalValue += 0.5*pawnInRow
              }
            }

            // if we are in the beginning of the game, we want to have a few different heuristics
            if ((whitePieces + blackPieces) >= 28){

              // removing points for moving queen too early in the game
              if (piece['type'] == 'q' && (queenRow != r || queenCol != i)){
                if (piece['color'] == 'b'){
                  totalValue -= 6
                } else {
                  totalValue += 6
                }
              }

              // points for moving knight early in the game
              if (piece['type'] == 'n' && (knightRow != r || (leftKnightCol != i || rightKnightCol != i ))){
                if (piece['color'] == 'b'){
                  totalValue += 3
                } else {
                  totalValue -= 3
                }
              }

              // points for moving bishop early in the game
              if (piece['type'] == 'b' && (bishopRow != r || (leftBishopCol != i || rightBishopCol != i ))){
                if (piece['color'] == 'b'){
                  totalValue += 3
                } else {
                  totalValue -= 3
                }
              }

              

              // points for dominating the middle squares
              // 4 squares in the center of the board
              if (centerRows.includes(r) && centerRows.includes(i)){
                if (piece['color'] == 'b'){
                  totalValue += 0.07
                } else {
                  totalValue -= 0.07
                }
              }

              // points for dominating the middle rows
              if (centerRows.includes(r) && centerColumns.includes(i)){
                if (piece['color'] == 'b'){
                  totalValue += 0.06
                } else {
                  totalValue -= 0.06
                }
              }
              
            }

            // if we are in the end game, we want to have a few different heuristics
            if (whitePieces <= 6){

              // points for sending enemy king to the corners
              if (piece['type'] == 'k' && piece['color'] == 'w'){

                if (corners.includes((r, i))){
                  totalValue += 9
                } else {
                  totalValue -= 9
                }
              }
            } else if (blackPieces <= 6){

              // points for sending enemy king to the corners
              if (piece['type'] == 'k' && piece['color'] == 'b'){

                if (corners.includes((r, i))){
                  totalValue -= 9
                } else {
                  totalValue += 9
                }
              }

            }


          }
          
        })
      })

      // this function will be called for both players so we need to adjust its output accordingly
      if (player){
        return totalValue
      } else {
        return -totalValue
      }

    }

    getBestMove=(game, depth, player)=>{
      // recursion base case
      if (depth === 0) {
        // evaluate this board
        var value = this.boardValue(game.board(), player);
        return [value, null]
      }

      var moves = game.moves()
      var bestMove = null;
      // to ensure that we make changes to a differnte game object
      var clonedGame = cloneDeep(game); 

      // initializing bestMoveValue found depending on the player
      if (player){
        var bestMoveValue = Number.NEGATIVE_INFINITY
      } else {
        var bestMoveValue = Number.POSITIVE_INFINITY
      }

      // Search through all possible moves
      for (var i = 0; i < moves.length; i++) {
        // Make fake move to calculate its value
        clonedGame.move(moves[i])

        // if game scenario has been a repeated for three times in a row, AI will not consider the 
        // same movement again
        if (clonedGame.in_threefold_repetition()) {
          // go to next possible move because this one was repeated 3 times.
          // added this constraint so the AI is forced to make different moves so the game won't get stuck.
          // undo last move
          game.undo();
          continue
        }

        // get best value from this move looking 2 depths ahead
        var value = this.getBestMove(clonedGame, depth-1, (!player))[0]

        if (player) {
          // Look for moves that maximize position, (AI moves)
          if (value > bestMoveValue) {
            // if it was the highest evaluation function move so far, we make this move
            bestMoveValue = value;
            bestMove = moves[i];
          }
          // setting alpha variable to do prunning later on
          var alpha = Math.max(Number.NEGATIVE_INFINITY, value);
        } else {
          // Look for best moves that minimize position, (Human moves)
          if (value < bestMoveValue) {
            // we assume human is making the best move for himself
            bestMoveValue = value;
            bestMove = moves[i];
          }
          // setting beta variable to do prunning
          var beta = Math.min(Number.POSITIVE_INFINITY, value);
        }

        // undo fake move, so we don't change the game scenario in any way
        game.undo();

        // alpha beta prunning when we already found a solution that is at least as good as the current one
        // those branches won't be able to influence the final decision so we don't need to waste time analyzing them
        if (beta <= alpha) {
          break;
        }

      }
      // if it returned no best move, we make a random one
      var randomNumber = Math.floor(Math.random() * (moves.length + 1));

      return [bestMoveValue, bestMove || moves[randomNumber]]
    };

    makeBestMove=()=> {

      if (this.game.game_over()) {
        this.setState(({gameOver: true, playerLost: false}))
        return
      }

      var bestMove = this.getBestMove(this.game, 2, true);

      this.game.move(bestMove[1]);

      this.setState(({
        fen: this.game.fen(),
        round: this.state.round + 1,
        // history: this.game.history({ verbose: true }),
        // squareStyles: squareStyling({ pieceSquare, history })
      }));

      if (this.game.game_over()) {
        this.setState(({gameOver: true, playerLost: true}))
      }
  };
  
    componentDidMount() {
      this.game = new Chess();
    }
  
    // keep clicked square style and remove hint squares
    removeHighlightSquare = () => {
      this.setState(({ pieceSquare, history }) => ({
        squareStyles: squareStyling({ pieceSquare, history })
      }));
    };
  
    // show possible moves
    highlightSquare = (sourceSquare, squaresToHighlight) => {
      const highlightStyles = [sourceSquare, ...squaresToHighlight].reduce(
        (a, c) => {
          return {
            ...a,
            ...{
              [c]: {
                background:
                  "radial-gradient(circle, #fffc00 36%, transparent 40%)",
                borderRadius: "50%"
              }
            },
            ...squareStyling({
              history: this.state.history,
              pieceSquare: this.state.pieceSquare
            })
          };
        },
        {}
      );
  
      this.setState(({ squareStyles }) => ({
        squareStyles: { ...squareStyles, ...highlightStyles }
      }));
    };
  
    onDrop = async ({ sourceSquare, targetSquare }) => {
      // see if the move is legal
      let move = this.game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q" // always promote to a queen for example simplicity
      });
  
      // illegal move
      if (move === null) return;
      this.setState(({ history, pieceSquare }) => ({
        fen: this.game.fen(),
        history: this.game.history({ verbose: true }),
        squareStyles: squareStyling({ pieceSquare, history })
      }));

      await new Promise(this.makeBestMove)
    };
  
    onMouseOverSquare = square => {
      // get list of possible moves for this square
      let moves = this.game.moves({
        square: square,
        verbose: true
      });
  
      // exit if there are no moves available for this square
      if (moves.length === 0) return;
  
      let squaresToHighlight = [];
      for (var i = 0; i < moves.length; i++) {
        squaresToHighlight.push(moves[i].to);
      }
  
      this.highlightSquare(square, squaresToHighlight);
    };
  
    onMouseOutSquare = square => this.removeHighlightSquare(square);
  
    // central squares get diff dropSquareStyles
    onDragOverSquare = square => {
      this.setState({
        dropSquareStyle:
          square === "e4" || square === "d4" || square === "e5" || square === "d5"
            ? { backgroundColor: "cornFlowerBlue" }
            : { boxShadow: "inset 0 0 1px 4px rgb(255, 255, 0)" }
      });
    };
  
    onSquareClick = square => {
      this.setState(({ history }) => ({
        squareStyles: squareStyling({ pieceSquare: square, history }),
        pieceSquare: square
      }));
  
      let move = this.game.move({
        from: this.state.pieceSquare,
        to: square,
        promotion: "q" // always promote to a queen for example simplicity
      });
  
      // illegal move
      if (move === null) return;
  
      this.setState({
        fen: this.game.fen(),
        history: this.game.history({ verbose: true }),
        pieceSquare: ""
      });

      setTimeout(this.makeBestMove, 250)
    };
  
    onSquareRightClick = square =>
      this.setState({
        squareStyles: { [square]: { backgroundColor: "deepPink" } }
      });

    restart = square => {
      this.game = new Chess();
      this.setState(({
        fen: "start", 
        gameOver: false, 
        playerLost: false,
        round: 0
      }))
    }
  
    render() {
      const { fen, dropSquareStyle, squareStyles, gameOver, playerLost } = this.state;
  
      return this.props.children({
        squareStyles,
        position: fen,
        onMouseOverSquare: this.onMouseOverSquare,
        onMouseOutSquare: this.onMouseOutSquare,
        onDrop: this.onDrop,
        dropSquareStyle,
        onDragOverSquare: this.onDragOverSquare,
        onSquareClick: this.onSquareClick,
        onSquareRightClick: this.onSquareRightClick,
        gameOver: gameOver,
        restart: this.restart,
        playerLost: playerLost
      });
    }
}

export default function WithMoveValidation() {
    return (
      <div>
        <HumanVsHuman>
          {({
            position,
            onDrop,
            onMouseOverSquare,
            onMouseOutSquare,
            squareStyles,
            dropSquareStyle,
            onDragOverSquare,
            onSquareClick,
            onSquareRightClick,
            gameOver,
            restart,
            playerLost
          }) => (
            <>
            <Chessboard
              id="humanVsHuman"
              width={320}
              position={position}
              onDrop={onDrop}
              onMouseOverSquare={onMouseOverSquare}
              onMouseOutSquare={onMouseOutSquare}
              boardStyle={{
                borderRadius: "5px",
                boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`
              }}
              squareStyles={squareStyles}
              dropSquareStyle={dropSquareStyle}
              onDragOverSquare={onDragOverSquare}
              onSquareClick={onSquareClick}
              onSquareRightClick={onSquareRightClick}
            />
            {gameOver && <div>
              <h1>Game Over {playerLost ? "You lost :(" : "You won!"}</h1>
              <button onClick={restart}>
                Restart Game
              </button>
              </div>}
            </>
          )}
        </HumanVsHuman>
        
      </div>
    );
}

const squareStyling = ({ pieceSquare, history }) => {
    const sourceSquare = history.length && history[history.length - 1].from;
    const targetSquare = history.length && history[history.length - 1].to;
  
    return {
      [pieceSquare]: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
      ...(history.length && {
        [sourceSquare]: {
          backgroundColor: "rgba(255, 255, 0, 0.4)"
        }
      }),
      ...(history.length && {
        [targetSquare]: {
          backgroundColor: "rgba(255, 255, 0, 0.4)"
        }
      })
    };
};
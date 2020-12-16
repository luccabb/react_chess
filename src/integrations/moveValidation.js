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

      board.forEach((row, r)=>{
        row.forEach((piece, i)=>{
          if (piece && piece['type'] in pieceValues){
            if (piece['color'] == 'b'){
              totalValue += pieceValues[piece['type']]
            } else {
              totalValue -= pieceValues[piece['type']]
            }

            if (this.state.round < 5 && centerRows.includes(r) && centerColumns.includes(i)){

              // removing points for moving queen too early in the game
              if (piece['type'] == 'q' && (queenRow != r || queenCol != i)){
                if (piece['color'] == 'b'){
                  totalValue -= 3
                } else {
                  totalValue += 3
                }
              }

              // points for dominating the middle squares
              if (this.state.round < 5 && centerRows.includes(r) && centerRows.includes(i)){
                if (piece['color'] == 'b'){
                  totalValue += 0.1
                } else {
                  totalValue -= 0.1
                }
                return
              }

              // points for dominating the middle rows
              if (piece['color'] == 'b'){
                totalValue += 0.05
              } else {
                totalValue -= 0.05
              }
              
            }
          }
          
        })
      })

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


      var possibleMoves = game.moves()
      var bestMove = null;
      var clonedGame = cloneDeep(game);

      var bestMoveValue = player ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
      // Search through all possible moves
      for (var i = 0; i < possibleMoves.length; i++) {
        // Make fake move to calculate its value
        clonedGame.move(possibleMoves[i])
        if (clonedGame.in_threefold_repetition()) {
          // go to next possible move because this one was repeated 3 times.
          // added this constraint so the AI is forced to make different moves so the game won't get stuck.
          // undo last move
          game.undo();
          continue
        }
        var value = this.getBestMove(clonedGame, depth-1, (!player))[0]

        if (player) {
          // Look for moves that maximize position
          if (value > bestMoveValue) {
            bestMoveValue = value;
            bestMove = possibleMoves[i];
          }
          var alpha = Math.max(Number.NEGATIVE_INFINITY, value);
        } else {
          // Look for moves that minimize position
          if (value < bestMoveValue) {
            bestMoveValue = value;
            bestMove = possibleMoves[i];
          }
          var beta = Math.min(Number.POSITIVE_INFINITY, value);
        }

        // Undo previous move
        game.undo();

        if (beta <= alpha) {
          break;
        }

      }

      var randomnumber = Math.floor(Math.random() * (possibleMoves.length + 1));
      return [bestMoveValue, bestMove || possibleMoves[randomnumber]]
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
  
    onDrop = ({ sourceSquare, targetSquare }) => {
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

      window.setTimeout(this.makeBestMove, 250);
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
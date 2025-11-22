import { createContext, useContext, useEffect, useState } from "react";
import { SocketContext } from "./SocketContextProvider";
import { Chess } from "chess.js";
import { ChessAndSocketEventEmitter } from "./ChessAndSocketEventEmitter";

const ChessContext = createContext();

const ChessContextProvider = (props) => {
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const { playerColor } = useContext(SocketContext);
  const [game, setGame] = useState(new Chess());
  const [capturedPieces, setCapturedPieces] = useState({
    black: [],
    white: [],
  });
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameStatus, setGameStatus] = useState("notOver");

  // function safeGameMutate(modify) {
  //   return new Promise((resolve, reject) => {
  //     setGame((g) => {
  //       const update = { ...g };
  //       modify(update);
  //       resolve();
  //       return update;
  //     });
  //   });
  // }

  function setNewGame() {
    setGame(new Chess());
    setCapturedPieces({
      black: [],
      white: [],
    });
    setMoveHistory([]);
  }

  function setNewGameEmit() {
    // Call the local function first
    setNewGame();
    // Then tell the opponent
    ChessAndSocketEventEmitter.emit("setNewGame");
  }

  function playerMakeMoveEmit(playerMoveFrom, playerMoveTo) {
    ChessAndSocketEventEmitter.emit("playerMakeMove", {
      playerMoveFrom,
      playerMoveTo,
    });
  }

  useEffect(() => {
    ChessAndSocketEventEmitter.on("opponentMakeMove", (data) => {
      // Use the functional setGame to get the latest state, move the copy of the game then update state
      setGame((g) => {
        const gameCopy = new Chess();
        const loadSuccess = gameCopy.load_pgn(g.pgn());

        const move = gameCopy.move({
          from: data.opponentMoveFrom,
          to: data.opponentMoveTo,
          promotion: "q",
        });

        if (!move) return g;

        if (move.captured) {
          const capturedColorArray = move.color === 'w' ? 'black' : 'white';
          addCapturedPieces(capturedColorArray, move.captured);
        }

        setLiveAnnouncement(`Opponent moved ${move.piece} from ${move.from} to ${move.to}.`);
        
        return gameCopy;
      });
    });

    ChessAndSocketEventEmitter.on("setNewGame", () => {
      setNewGame();
    });

    return () => {
      ChessAndSocketEventEmitter.off("opponentMakeMove");
      ChessAndSocketEventEmitter.off("setNewGame");
    }
  }, []);

  function playerMakeMove(playerMoveFrom, playerMoveTo, callback) {
    setGame((g) => {
      const gameCopy = new Chess();
      gameCopy.load_pgn(g.pgn());

      const move = gameCopy.move({
        from: playerMoveFrom,
        to: playerMoveTo,
        promotion: "q",
      });

      if (move === null) {
        callback(false);
        return g; // Return old state
      }

      //Update captured pieces
      if (move.captured) {
        addCapturedPieces("black", move.captured);
      }
      
      callback(true);
      return gameCopy; // Return new state
    });
  }

  function addCapturedPieces(color, pieceSymbol) {
    setCapturedPieces((prevCapturedPieces) => {
      return {
        ...prevCapturedPieces,
        [color]: [...prevCapturedPieces[color], pieceSymbol],
      };
    });
  }

  // Simplified this function. No need for Promises.
  function popCapturedPieces(color) {
    setCapturedPieces((prevCapturedPieces) => {
      let newCapturedPieces =
        prevCapturedPieces[color].length > 0
          ? prevCapturedPieces[color].slice(0, -1)
          : [...prevCapturedPieces[color]];
      return {
        ...prevCapturedPieces,
        [color]: newCapturedPieces,
      };
    });
  }

  // Rewritten to use the new immutable pattern
  function playerUndo() {
    setGame((g) => {
      // Create a new copy of the game
      const gameCopy = new Chess();
      gameCopy.load_pgn(g.pgn());
      let undoneMoves = [];

      // Try to undo the player's move
      const move1 = gameCopy.undo();
      if (move1) undoneMoves.push(move1);

      // Try to undo the opponent's move
      const move2 = gameCopy.undo();
      if (move2) undoneMoves.push(move2);

      console.log("Moves undone:", undoneMoves.length);

      // If no moves were undone (e.g., start of game),
      // just return the original state.
      if (undoneMoves.length === 0) {
        return g;
      }

      // Now, iterate the *valid* undone moves
      for (const undoneMove of undoneMoves) {
        // Check if this undone move *was* a capture
        if (undoneMove.captured) {
          // The move 'color' is the one who made the move.
          // The captured piece is the *opposite* color.
          const colorOfCapturedArray = undoneMove.color === "w" ? "black" : "white";
          popCapturedPieces(colorOfCapturedArray);
        }
      }
      
      // Return the new game state to trigger the re-render
      return gameCopy;
    });
  }

  function updateMoveHistory(verbose) {
    setMoveHistory(game.history({ verbose: verbose }));
  }

  function checkTurn() {
    return game.turn();
  }

  function checkGameStatus() {
    const possibleMovesNumber = game.moves().length;

    if (game.in_checkmate() || possibleMovesNumber === 0)
      return game.turn() === "w" ? "blackWin" : "whiteWin";
    else if (game.in_draw()) return "draw";
    else return "notOver";
  }

  useEffect(() => {
    updateMoveHistory(true);
    const status = checkGameStatus();
    setGameStatus(status);

    if (status === "blackWin") {
      setLiveAnnouncement("Checkmate. Black wins.");
    } else if (status === "whiteWin") {
      setLiveAnnouncement("Checkmate. White wins.");
    } else if (status === "draw") {
      setLiveAnnouncement("Game is a draw.");
    } else if (status === "notOver") {

      if (game.in_check()) {
        const playerInCheck = game.turn() === 'w' ? "White" : "Black";
        setLiveAnnouncement(`${playerInCheck} is in check.`);
      }
    }
  }, [game]);

  return (
    <ChessContext.Provider
      value={{
        game,
        capturedPieces,
        playerMakeMove,
        playerMakeMoveEmit,
        playerUndo,
        moveHistory,
        checkTurn,
        setNewGame,
        setNewGameEmit,
        gameStatus,
        liveAnnouncement,
        setLiveAnnouncement,
      }}
    >
      {props.children}
    </ChessContext.Provider>
  );
};

export { ChessContext, ChessContextProvider };

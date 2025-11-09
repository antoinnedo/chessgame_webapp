import {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Chessboard } from "react-chessboard";
import { SocketContext } from "../ContextProvider/SocketContextProvider";
import { ChessContext } from "../ContextProvider/ChessContextProvider";
import { AccessibilityContext } from "../ContextProvider/AccessibilityContext";
import "./AccessibleChessBoard.css";
import { speak } from '../services/TextToSpeech'; 

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
const pieceDescriptions = {
  p: "pawn",
  r: "rook",
  n: "knight",
  b: "bishop",
  q: "queen",
  k: "king",
};

const unicodePieces = {
  w: {
    k: "♔",
    q: "♕",
    r: "♖",
    b: "♗",
    n: "♘",
    p: "♙",
  },
  b: {
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟︎",
  },
};

function formatSquare(square) {
  return `${square[0].toUpperCase()}${square.slice(1)}`;
}

function describePiece(piece) {
  if (!piece) {
    return "an empty square";
  }
  const color = piece.color === "w" ? "White" : "Black";
  const name = pieceDescriptions[piece.type] || piece.type;
  return `${color} ${name}`;
}

function getSymbol(piece) {
  if (!piece) {
    return "·";
  }
  const symbolSet = unicodePieces[piece.color];
  return symbolSet?.[piece.type] || piece.type.toUpperCase();
}

function ChessBoard() {
  const { game, gameStatus, playerMakeMoveEmit, playerMakeMove } =
    useContext(ChessContext);
  const { playerColor } = useContext(SocketContext);
  const { isAccessibleMode } = useContext(AccessibilityContext);

  const [moveFrom, setMoveFrom] = useState("");
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [optionSquares, setOptionSquares] = useState({});
  const [activeSquare, setActiveSquare] = useState("");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const squareRefs = useRef(new Map());
  const previousHistoryLength = useRef(
    game.history({ verbose: true }).length
  );

  const columnOrder = useMemo(() => {
    return playerColor === "white" ? files.slice() : files.slice().reverse();
  }, [playerColor]);

  const rowOrder = useMemo(() => {
    return playerColor === "white" ? ranks.slice().reverse() : ranks.slice();
  }, [playerColor]);

  const defaultSquare = useMemo(
    () => `${columnOrder[0]}${rowOrder[0]}`,
    [columnOrder, rowOrder]
  );

  const fen = game.fen();
  const history = useMemo(() => game.history({ verbose: true }), [fen]);

  useEffect(() => {
    if (history.length !== previousHistoryLength.current) {
      if (history.length > 0) {
        const lastMove = history[history.length - 1];
        const mover = lastMove.color === "w" ? "White" : "Black";
        const pieceName = pieceDescriptions[lastMove.piece] || lastMove.piece;
        const captureText = lastMove.captured
          ? ` capturing ${
              lastMove.color === "w" ? "black" : "white"
            } ${pieceDescriptions[lastMove.captured] || lastMove.captured}`
          : "";
        const checkText = lastMove.san.includes("#")
          ? " Checkmate."
          : lastMove.san.includes("+")
          ? " Check."
          : ".";
        
        const announcementString = `${mover} ${pieceName} from ${formatSquare(
          lastMove.from
        )} to ${formatSquare(lastMove.to)}${captureText}${checkText}`;
        
        setLiveAnnouncement(announcementString);
        speak(announcementString);
      }
      previousHistoryLength.current = history.length;
    }
  }, [history]);

  useEffect(() => {
    if (isAccessibleMode) {
      setActiveSquare((current) => current || defaultSquare);
      setLiveAnnouncement((current) =>
        current ||
          "Accessible mode enabled. Use the arrow keys to move between squares and press Enter or Space to select a piece or confirm a move."
      );
    } else {
      setActiveSquare("");
    }
  }, [defaultSquare, isAccessibleMode]);

  useEffect(() => {
    if (!isAccessibleMode) {
      return;
    }
    const focusTarget = activeSquare || defaultSquare;
    const node = squareRefs.current.get(focusTarget);
    if (node && document.activeElement !== node) {
      node.focus();
    }
  }, [activeSquare, defaultSquare, isAccessibleMode]);

  const playerTurn = game.turn();
  const playerSide = playerColor === "white" ? "w" : "b";
  const isPlayersTurn = playerTurn === playerSide;

  const resetSelection = useCallback(() => {
    setMoveFrom("");
    setOptionSquares({});
  }, []);

  const getMoveOptions = useCallback(
    (square) => {
      const moves = game.moves({
        square,
        verbose: true,
      });
      if (!moves.length) {
        setOptionSquares({});
        return [];
      }

      const newSquares = {};
      moves.forEach((move) => {
        newSquares[move.to] = {
          background:
            game.get(move.to) &&
            game.get(move.to).color !== game.get(square).color
              ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
              : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
          borderRadius: "50%",
        };
      });
      newSquares[square] = {
        background: "rgba(255, 255, 0, 0.4)",
      };
      setOptionSquares(newSquares);
      return moves;
    },
    [game]
  );

  const handleSuccessfulMove = useCallback(
    (fromSquare, toSquare) => {
      if (gameStatus === "notOver") {
        setTimeout(playerMakeMoveEmit, 300, fromSquare, toSquare);
      }
      setRightClickedSquares({});
      setMoveFrom("");
      setOptionSquares({});
      if (isAccessibleMode) {
        setActiveSquare(toSquare);
        setLiveAnnouncement(
          `Move confirmed from ${formatSquare(fromSquare)} to ${formatSquare(
            toSquare
          )}.`
        );
      }
    },
    [gameStatus, isAccessibleMode, playerMakeMoveEmit]
  );

  const moveFocusBy = useCallback(
    (rowDelta, colDelta) => {
      setActiveSquare((currentSquare) => {
        const origin = currentSquare || defaultSquare;
        const currentFile = origin[0];
        const currentRank = origin.slice(1);
        const rowIndex = rowOrder.indexOf(currentRank);
        const colIndex = columnOrder.indexOf(currentFile);

        const nextRowIndex = Math.min(
          Math.max(rowIndex + rowDelta, 0),
          rowOrder.length - 1
        );
        const nextColIndex = Math.min(
          Math.max(colIndex + colDelta, 0),
          columnOrder.length - 1
        );

        return `${columnOrder[nextColIndex]}${rowOrder[nextRowIndex]}`;
      });
    },
    [columnOrder, defaultSquare, rowOrder]
  );

  const handleAccessibleSquareSelect = useCallback(
    (square) => {
      if (!isAccessibleMode) {
        return;
      }

      if (!isPlayersTurn) {
        const pieceOnSquare = game.get(square);
        setLiveAnnouncement(
          `It is not your turn. ${pieceOnSquare ? `${describePiece(pieceOnSquare)} on ${formatSquare(square)}.` : `Square ${formatSquare(square)} is empty.`}`
        );
        if (moveFrom) {
          resetSelection();
        }
        return;
      }

      const piece = game.get(square);

      if (!moveFrom) {
        if (!piece) {
          setLiveAnnouncement(
            `Square ${formatSquare(square)} is empty. Select one of your pieces to begin a move.`
          );
          return;
        }
        if (piece.color !== playerSide) {
          setLiveAnnouncement(
            `You cannot move ${describePiece(piece)} on ${formatSquare(
              square
            )} because it belongs to your opponent.`
          );
          return;
        }
        const moves = getMoveOptions(square);
        if (!moves.length) {
          setLiveAnnouncement(
            `${describePiece(piece)} on ${formatSquare(square)} has no legal moves.`
          );
          resetSelection();
          return;
        }
        setMoveFrom(square);
        setActiveSquare(square);
        setLiveAnnouncement(
          `Selected ${describePiece(piece)} on ${formatSquare(
            square
          )}. Legal moves: ${moves
            .map((move) => formatSquare(move.to))
            .join(", ")}`
        );
        return;
      }

      if (square === moveFrom) {
        resetSelection();
        setLiveAnnouncement("Selection cleared.");
        return;
      }

      const originSquare = moveFrom;
      playerMakeMove(originSquare, square, (validated) => {
        if (!validated) {
          const nextPiece = game.get(square);
          const moves = getMoveOptions(square);
          if (nextPiece && nextPiece.color === playerSide && moves.length) {
            setMoveFrom(square);
            setActiveSquare(square);
            setLiveAnnouncement(
              `Changed selection to ${describePiece(nextPiece)} on ${formatSquare(
                square
              )}. Legal moves: ${moves
                .map((move) => formatSquare(move.to))
                .join(", ")}`
            );
            return;
          }
          resetSelection();
          setLiveAnnouncement(`Move to ${formatSquare(square)} is not legal.`);
          return;
        }
        handleSuccessfulMove(originSquare, square);
      });
    },
    [
      game,
      getMoveOptions,
      handleSuccessfulMove,
      isAccessibleMode,
      isPlayersTurn,
      moveFrom,
      playerMakeMove,
      playerSide,
      resetSelection,
    ]
  );

  const handleSquareKeyDown = useCallback(
    (event, square) => {
      if (!isAccessibleMode) {
        return;
      }
      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          moveFocusBy(-1, 0);
          break;
        case "ArrowDown":
          event.preventDefault();
          moveFocusBy(1, 0);
          break;
        case "ArrowLeft":
          event.preventDefault();
          moveFocusBy(0, -1);
          break;
        case "ArrowRight":
          event.preventDefault();
          moveFocusBy(0, 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          handleAccessibleSquareSelect(square);
          break;
        case "Escape":
          event.preventDefault();
          resetSelection();
          setLiveAnnouncement("Selection cleared.");
          break;
        default:
          break;
      }
    },
    [handleAccessibleSquareSelect, isAccessibleMode, moveFocusBy, resetSelection]
  );

  function onSquareClick(square) {
    if (
      (playerColor === "white" && game.turn() === "b") ||
      (playerColor === "black" && game.turn() === "w")
    ) {
      return;
    }

    setRightClickedSquares({});

    if (!moveFrom) {
      const moves = getMoveOptions(square);
      if (moves.length) {
        setMoveFrom(square);
        if (isAccessibleMode) {
          const piece = game.get(square);
          setActiveSquare(square);
          setLiveAnnouncement(
            `Selected ${describePiece(piece)} on ${formatSquare(square)}.`
          );
        }
      }
      return;
    }

    if (square === moveFrom) {
      resetSelection();
      return;
    }

    const originSquare = moveFrom;
    playerMakeMove(originSquare, square, (validated) => {
      if (!validated) {
        const moves = getMoveOptions(square);
        if (moves.length) {
          setMoveFrom(square);
          if (isAccessibleMode) {
            const piece = game.get(square);
            setActiveSquare(square);
            setLiveAnnouncement(
              `Selected ${describePiece(piece)} on ${formatSquare(square)}.`
            );
          }
        } else {
          resetSelection();
        }
        return;
      }
      handleSuccessfulMove(originSquare, square);
    });
  }

  function onSquareRightClick(square) {
    const colour = "rgba(0, 0, 255, 0.4)";
    setRightClickedSquares((prevSquares) => ({
      ...prevSquares,
      [square]:
        prevSquares[square] && prevSquares[square].backgroundColor === colour
          ? undefined
          : { backgroundColor: colour },
    }));
  }

  return (
    <div className="chessboard-wrapper">
      <div
        className={`announcer${isAccessibleMode ? "" : " visually-hidden"}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveAnnouncement}
      </div>

      {isAccessibleMode && (
        <p className="accessible-board-instructions">
          Use Tab to leave the board. Use arrow keys to explore squares and
          press Enter or Space to pick up or drop a piece.
        </p>
      )}

      <div className="board-stack-container">
        
        <Chessboard
          id="ClickToMove"
          boardOrientation={playerColor}
          animationDuration={600}
          arePiecesDraggable={false}
          position={game.fen()}
          onSquareClick={onSquareClick}
          onSquareRightClick={onSquareRightClick}
          customBoardStyle={{
            borderRadius: "4px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
            // Disable mouse clicks when the overlay is active
            pointerEvents: isAccessibleMode ? "none" : "auto",
          }}
          customSquareStyles={{
            ...optionSquares,
            ...rightClickedSquares,
          }}
          className="chessboard"
          aria-hidden="true" 
          tabIndex={-1}
        />

        {isAccessibleMode && (
          <div
            role="grid"
            aria-label={`Chess board. ${
              isPlayersTurn ? "Your turn." : "Waiting for opponent."
            }`}
            className="accessible-board overlay"
          >
            {rowOrder.map((rank) => (
              <div role="row" className="accessible-board-row" key={rank}>
                {columnOrder.map((file) => {
                  const square = `${file}${rank}`;
                  const piece = game.get(square);
                  const isSelected = moveFrom === square;
                  const isLegalDestination = Boolean(optionSquares[square]);
                  const tabStopSquare = activeSquare || defaultSquare;
                  const isTabStop = tabStopSquare === square;                  
                  return (
                    <button
                      key={square}
                      ref={(node) => {
                        if (node) {
                          squareRefs.current.set(square, node);
                        } else {
                          squareRefs.current.delete(square);
                        }
                      }}
                      type="button"
                      role="gridcell"
                      className="accessible-square" 
                      data-square={square}
                      onClick={() => handleAccessibleSquareSelect(square)}
                      onFocus={() => setActiveSquare(square)}
                      onKeyDown={(event) => handleSquareKeyDown(event, square)}
                      tabIndex={isTabStop ? 0 : -1}
                      aria-label={`Square ${formatSquare(square)}. ${
                        piece ? describePiece(piece) : "Empty square"
                      }${isSelected ? ". Selected." : ""}${
                        isLegalDestination ? " Legal destination." : ""
                      }`}
                      data-selected={isSelected}
                      data-highlighted={isLegalDestination}
                    >
                      <span aria-hidden="true" className="visually-hidden">
                        {getSymbol(piece)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default ChessBoard;

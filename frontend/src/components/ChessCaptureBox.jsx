import { useContext } from "react";
import "./ChessCaptureBox.css";
import { SocketContext } from "../ContextProvider/SocketContextProvider";
import { ChessContext } from "../ContextProvider/ChessContextProvider";

export default function ChessCaptureBox(props) {
  const { avatars } = useContext(SocketContext);
  const { checkTurn } = useContext(ChessContext);

  const chessSymbols = new Map([
    [
      "black",
      new Map([
        ["k", "♚"],
        ["q", "♛"],
        ["r", "♜"],
        ["b", "♝"],
        ["n", "♞"],
        ["p", "♟︎"],
      ]),
    ],
    [
      "white",
      new Map([
        ["k", "♔"],
        ["q", "♕"],
        ["r", "♖"],
        ["b", "♗"],
        ["n", "♘"],
        ["p", "♙"],
      ]),
    ],
  ]);

  const pieces = props.capturedPieces.map((pieceSymbol, index) => ({
    id: `${props.color}-${pieceSymbol}-${index}`,
    symbol: chessSymbols.get(props.color).get(pieceSymbol),
    name: pieceSymbol,
  }));

  const isActive =
    (props.color === "white" && checkTurn() === "b") ||
    (props.color === "black" && checkTurn() === "w");

  return (
    <section
      className="chess-capture-box"
      aria-labelledby={`${props.color}-capture-heading`}
    >
      <div className="chess-capture-box-headline">
        <h2 id={`${props.color}-capture-heading`} className="capture-heading">
          {props.headline}
        </h2>
        <div
          className={`avatar-wrapper shadow-box ${isActive ? "pulse" : ""}`}
          aria-live="polite"
        >
          <img
            src={avatars[props.color]}
            className="avatar"
            alt={`${props.headline} player avatar`}
          />
        </div>
      </div>
      <div className="capturedPieces shadow-box">
        {pieces.length > 0 ? (
          <ul className="captured-list" aria-live="polite">
            {pieces.map((piece) => (
              <li className="capturedPiece" key={piece.id}>
                <span aria-hidden="true">{piece.symbol}</span>
                <span className="sr-only">Captured {piece.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-captures">No captured pieces</p>
        )}
      </div>
    </section>
  );
}

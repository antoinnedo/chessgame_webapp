import { useContext, useEffect, useState } from "react";

import { BiUndo, BiRefresh } from "react-icons/bi";
import { FiClipboard } from "react-icons/fi";
import { Tooltip } from "react-tooltip";

import "./ControlBox.css";
import { ChessContext } from "../ContextProvider/ChessContextProvider";
import { SocketContext } from "../ContextProvider/SocketContextProvider";
import { AccessibilityContext } from "../ContextProvider/AccessibilityContext";

function HistoryBox() {
  const { moveHistory } = useContext(ChessContext);
  const [moveHistoryProcessed, setMoveHistoryProcessed] = useState([]);

  useEffect(() => {
    let temp = [];
    for (let idx = 0; idx < moveHistory.length; idx++) {
      if (idx % 2 === 0) temp.push(`${moveHistory[idx].san}`);
      else
        temp[temp.length - 1] = `${temp[temp.length - 1]} ${
          moveHistory[idx].san
        }`;
    }
    setMoveHistoryProcessed(temp);
  }, [moveHistory]);

  return (
    <div className="move-items">
      {moveHistoryProcessed.map((move, idx) => (
        <div
          className={idx % 2 === 0 ? "move-item even" : "move-item odd"}
          key={idx}
        >
          {idx + 1}. {move}
        </div>
      ))}
    </div>
  );
}

function RoomLinkBox() {
  const { roomLink } = useContext(SocketContext);
  const [copyStatus, setCopyStatus] = useState("");

  return (
    <div className="room-link-box-wrapper shadow-box">
      <h1 id="roomLinkTitle">Invite friends to this room</h1>
      <div className="room-link-box">
        <input
          type="text"
          id="roomLink"
          className="shadow-box"
          value={roomLink}
          readOnly
          aria-describedby="copyStatusMessage"
        />
        <button
          type="button"
          className="copy-icon-wrapper button shadow-box"
          onClick={() => {
            navigator.clipboard.writeText(roomLink);
            setCopyStatus("Room link copied to clipboard.");
            setTimeout(() => setCopyStatus(""), 2500);
          }}
          data-tooltip-id="copy-tooltip"
          data-tooltip-content="Copy room link"
        >
          <FiClipboard className="copy-icon" aria-hidden="true" />
          <span className="sr-only">Copy room link</span>
          <Tooltip id="copy-tooltip" />
        </button>
      </div>
      <div
        id="copyStatusMessage"
        className="sr-only"
        aria-live="polite"
      >
        {copyStatus}
      </div>
    </div>
  );
}

export default function ControlBox() {
  const { 
    playerColor,
    playerUndoEmit, 
    setNewGameEmit, 
    setDifficultyEmit, 
    setAIModelEmit 
  } = useContext(SocketContext);
  const { 
    playerUndo, 
    checkTurn, 
    setNewGame, 
    gameStatus 
  } = useContext(ChessContext);
  const { 
    isAccessibleMode, 
    setAccessibleMode 
  } = useContext(AccessibilityContext);

  //Message Box
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("normal");
  const [visibleMessageBox, setVisibleMessageBox] = useState(true);

  function aiModelSelect(evt) {
    setAIModelEmit(evt.target.value, (succeed) => {
      if (!succeed) alert("Please try setting AI model again");
    });
  }

  function difficultySelect(evt) {
    setDifficultyEmit(parseInt(evt.target.value), (succeed) => {
      if (!succeed) alert("Please try setting difficulty again");
    });
  }

  function onClickUndoButton(evt) {
    const playerSide = playerColor === "white" ? "w" : "b";

    if (checkTurn() !== playerSide) {
      setVisibleMessageBox(true);
      setMessageType("warning");
      setMessage("Please wait until the opponent finishes their turn.");
      setTimeout(() => {
        setMessage("");
        setVisibleMessageBox(false);
      }, 1600);
      return;
    }
    
    playerUndoEmit((succeed) => {
      console.log("playerUndoEmit succeeded:", succeed);
      if (succeed) {
        playerUndo();
      }
    });
  }

  function onClickNewGameButton(evt) {
    setNewGameEmit((succeed) => {
      if (succeed) {
        setNewGame();
        setMessage("");
        setMessageType("normal");
        setVisibleMessageBox(false);
      }
    });
  }

  useEffect(() => {
    switch (gameStatus) {
      case "whiteWin":
        setMessage("White wins! Please start a new game.");
        setMessageType("normal");
        setVisibleMessageBox(true);
        break;
      case "blackWin":
        setMessage("Black wins! Please start a new game.");
        setMessageType("normal");
        setVisibleMessageBox(true);
        break;
      case "draw":
        setMessage("Draw! Please start a new game.");
        setMessageType("normal");
        setVisibleMessageBox(true);
        break;
      default:
        setMessage("");
        setMessageType("normal");
        setVisibleMessageBox(false);
        break;
    }
  }, [gameStatus]);
  return (
    <div className="control-box-container">
      <div className="control-box shadow-box">
        <div className="difficulty-select container-fluid">
          <div className="row gy-3">
            <div className="col-sm-5 col-md-5 col-lg-5" id="heading">
              AI Model
            </div>
            <div className="col-sm-7 col-md-7 col-lg-7">
              <select
                className="form-select"
                aria-label="Select AI model"
                onChange={aiModelSelect}
                defaultValue="stockfish"
              >
                <option value="minimax">Minimax Model (Easy Mode)</option>
                <option value="stockfish">Stockfish Model (Expert Mode)</option>
              </select>
            </div>

            <div className="col-sm-5 col-md-5 col-lg-5" id="heading">
              Difficulty
            </div>
            <div className="col-sm-7 col-md-7 col-lg-7">
              <select
                className="form-select"
                aria-label="Select difficulty"
                onChange={difficultySelect}
                defaultValue="1"
              >
                <option value="0">Easy</option>
                <option value="1">Medium</option>
              </select>
            </div>
          </div>
        </div>
        <div className="accessible-mode-toggle">
          <label htmlFor="accessibleModeSwitch" className="toggle-label">
            <input
              id="accessibleModeSwitch"
              type="checkbox"
              checked={isAccessibleMode}
              onChange={(event) => setAccessibleMode(event.target.checked)}
            />
            <span>Accessible mode</span>
          </label>
          <p className="toggle-help">
            {isAccessibleMode
              ? "Accessible mode is on. Screen readers and keyboard controls are optimized."
              : "Turn on accessible mode for enhanced screen reader and keyboard support."}
          </p>
        </div>
        <h6 id="move-history-heading">Move History</h6>
        <div className="history-box shadow-box island">
          <HistoryBox />
        </div>
        <div className="button-box">
          <button
            type="button"
            className="button circle-frame"
            onClick={onClickUndoButton}
            data-tooltip-id="bottom-tooltip"
            data-tooltip-content="Undo"
            aria-label="Undo last move"
          >
            <BiUndo size="3.5vh" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="button circle-frame"
            onClick={onClickNewGameButton}
            data-tooltip-id="bottom-tooltip"
            data-tooltip-content="New Game"
            aria-label="Start a new game"
          >
            <BiRefresh size="3.5vh" aria-hidden="true" />
          </button>
        </div>
      </div>
      <Tooltip id="bottom-tooltip" place="bottom"/>
      <RoomLinkBox />
      {visibleMessageBox ? (
        messageType === "normal" ? (
          <div
            className="message-box shadow-box white-background"
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        ) : (
          <div
            className="message-box shadow-box red-background"
            role="alert"
          >
            {message}
          </div>
        )
      ) : (
        <div className="message-box hidden">{message}</div>
      )}
    </div>
  );
}

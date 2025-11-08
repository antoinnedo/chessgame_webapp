import React, { useContext, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { ChessContext } from '../ContextProvider/ChessContextProvider';
import { SocketContext } from '../ContextProvider/SocketContextProvider';
import GameContainer from './GameContainer';
import ControlBox from './ControlBox';
import VoiceNavigation from './VoiceNavigation';

export default function GameLayout() {
  const { game, playerMakeMove, playerMakeMoveEmit, gameStatus } = useContext(ChessContext);
  const { playerColor } = useContext(SocketContext);

  const handleVoiceMove = useCallback((sanMove) => {
    const playerSide = playerColor === "white" ? "w" : "b";
    if (game.turn() !== playerSide || gameStatus !== "notOver") {
      console.warn("Not your turn or game is over.");
      return;
    }

    const tempGame = new Chess(game.fen());
    let moveObject = null;
    
    try {
      moveObject = tempGame.move(sanMove);
    } catch (e) {
      console.error("Invalid move:", e);
      return;
    }

    if (moveObject === null) {
      console.warn("Invalid move:", sanMove);
      return;
    }

    const fromSquare = moveObject.from;
    const toSquare = moveObject.to;

    playerMakeMove(fromSquare, toSquare, (validated) => {
      if (!validated) {
        console.error("Move failed validation:", fromSquare, toSquare);
        return;
      }
      if (gameStatus === "notOver") {
        setTimeout(playerMakeMoveEmit, 300, fromSquare, toSquare);
      }
    });
  }, [game, playerColor, gameStatus, playerMakeMove, playerMakeMoveEmit]);

  useEffect(() => {
    window.testMove = handleVoiceMove;
    console.log("Testing function 'testMove(san)' is now available in the console.");

    return () => {
      window.testMove = null;
    };
  }, [handleVoiceMove]);

  return (
    <div className="app container-fluid">
      <VoiceNavigation onMoveFound={handleVoiceMove} />
      
      <div className="row">
        <div className="col-lg-8 col-md-12 col-sm-12">
          <GameContainer />
        </div>
        <div className="col-lg-4 col-md-10 col-sm-12">
          <ControlBox />
        </div>
      </div>
    </div>
  );
}
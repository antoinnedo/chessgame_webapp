import { Server as HttpServer } from "http";
import { Socket, Server } from "socket.io";
import { ChessMinimaxModel, GameStatus } from "./model/ChessMinimaxModel";
import { v4 as uuidv4 } from "uuid";
import { ChessEngine } from "./model/ChessModel";
import ChessAIModelInterface from "./model/ChessAIModelInterface";
import ChessStockfishModel from "./model/ChessStockfishEngine";

type Color = "white" | "black";

export class ServerSocket {
  public static instance: ServerSocket;
  public io: Server;

  private socketsRecord: Map<
    string,
    {
      roomID: string;
      userColor: Color;
      isInMultiplayerMode: boolean;
    }
  > = new Map(); //userID: {roomID, userColor}

  private roomsRecord: Map<
    string,
    { white: string; black: string; numberOfPlayers: number }
  > = new Map(); //RoomID: {whiteSocketID, blackSocketID}

  /** Master list of all connected rooms */

  constructor(server: HttpServer) {
    ServerSocket.instance = this;
    this.io = new Server(server, {
      serveClient: false,
      pingInterval: 10000,
      pingTimeout: 5000,
      cookie: false,
      cors: {
        origin: "*",
      },
    });

    this.io.on("connect", this.StartListeners);
  }

  emitGameOver(gameStatus: GameStatus, socket: Socket) {
    if (gameStatus !== "notOver") {
      socket.emit("gameOver", gameStatus);
    }
  }

  updateSocketsRecord(
    roomID: string,
    socketID: string,
    playerColor: Color,
    isInMultiplayerMode: boolean
  ) {
    if (!this.socketsRecord.has(socketID))
      this.socketsRecord.set(socketID, {
        roomID: roomID,
        userColor: playerColor,
        isInMultiplayerMode: isInMultiplayerMode,
      });
  }

  udpateRoomsRecord(roomID: string, socketID: string, playerColor: Color) {
    if (!this.roomsRecord.has(roomID))
      this.roomsRecord.set(roomID, {
        white: "",
        black: "",
        numberOfPlayers: 0,
      });

    this.roomsRecord.get(roomID)![playerColor] = socketID;
    this.roomsRecord.get(roomID)!.numberOfPlayers += 1;
  }

  StartListeners = async (socket: Socket) => {
    console.info("Message received from " + socket.id);
    let difficulty = 1;
    let chessEngine: ChessAIModelInterface | null = null;

    socket.on(
      "joinRoom",
      async (
        clientRoomID: string,
        callback: (
          succeed: boolean,
          roomID: string | null,
          playerColor: Color | null
        ) => void
      ) => {
        console.log("Join room request");
        let roomID: string;
        //if no record about this socket and no input roomID => This is a new socket and need to create a new room
        if (!this.socketsRecord.has(socket.id) && !clientRoomID) {
          roomID = uuidv4();
          this.updateSocketsRecord(roomID, socket.id, "white", false);
          this.udpateRoomsRecord(roomID, socket.id, "white");

          try {
            console.log(`Loading Stockfish for new AI room [${roomID}]...`);
            chessEngine = await ChessStockfishModel.loadStockfishEngine(difficulty);
            console.log(`Stockfish loaded for room: ${roomID}`);
          } catch (e) {
            console.error("Stockfish failed to load!", e);
            callback(false, null, null);
            return;
          }
        }

        //no record about this socket and do have input roomID => this socket want to join a room
        else if (!this.socketsRecord.has(socket.id) && clientRoomID) {
          roomID = clientRoomID;

          //Check if room exist and check number of player in room
          if (
            !this.roomsRecord.has(clientRoomID) ||
            this.roomsRecord.get(clientRoomID)!.numberOfPlayers >= 2
          ) {
            callback(false, null, null);
            return;
          }

          this.updateSocketsRecord(clientRoomID, socket.id, "black", true);
          this.udpateRoomsRecord(clientRoomID, socket.id, "black");
          
          // Check if white socket still exists before accessing it
          const whiteSocketID = this.roomsRecord.get(clientRoomID)!.white;
          const whiteSocketRecord = this.socketsRecord.get(whiteSocketID);
          if (whiteSocketRecord) {
            whiteSocketRecord.isInMultiplayerMode = true;
          }

          //Force White to reset the game when going in multiplayer mode
          socket.to(roomID).emit("setNewGame");

          //Callback to black player socket
          callback(true, roomID, "black");
        } else {
          // This is the reconnecting player case
          const existingRecord = this.socketsRecord.get(socket.id);
          if (existingRecord) {
             roomID = existingRecord.roomID;
             // Don't need to load engine, it should be loaded or this is multiplayer
             console.log(`Socket ${socket.id} rejoining room ${roomID}`);
             callback(true, existingRecord.roomID, existingRecord.userColor);
          } else {
             // Should be impossible to get here
             console.log("Error: Socket not in record but also not new.");
             callback(false, null, null);
             return;
          }
        }
        //Join room
        socket.join(roomID.trim());
        // console.log(`RoomID: ${roomID}`);
      }
    );

    socket.on(
      "playerMakeMove",
      async (playerMoveFrom: string, playerMoveTo: string) => {
        // console.log(
        //   `player make move from ${playerMoveFrom} to ${playerMoveTo}`
        // );
        const socketInfo = this.socketsRecord.get(socket.id);
        if (!socketInfo) return;
        const roomID = socketInfo.roomID;

        if (socketInfo.isInMultiplayerMode) {
          // Multiplayer mode
          socket
            .to(roomID)
            .emit("opponentMakeMove", playerMoveFrom, playerMoveTo);
          return;
        }

        // AI Mode
        if (!chessEngine) {
          console.warn(`Engine for room ${roomID} not loaded yet, ignoring move.`);
          return; // Engine is still loading, just drop the move.
        }
        
        chessEngine.updatePlayerMove(
          playerMoveFrom,
          playerMoveTo
        );

        let [opponentMoveFrom, opponentMoveTo] = await chessEngine.computerMakingMove();

        if (opponentMoveFrom && opponentMoveTo)
          socket.emit("opponentMakeMove", opponentMoveFrom, opponentMoveTo);
      }
    );

    socket.on("playerUndo", async (callback: (succeed: boolean) => void) => {
      const socketInfo = this.socketsRecord.get(socket.id);
      if (this.socketsRecord.get(socket.id)?.isInMultiplayerMode || !socketInfo) {
        callback(false);
        return;
      }

      if (!chessEngine) {
        callback(false); // engine not loaded
        return;
      }

      try {
        chessEngine.playerUndo();
      } catch (e: any) {
        callback(false);
      }
      callback(true);
    });

    socket.on(
      "setDifficulty",
      async (difficultyNum: number, callback: (succeed: boolean) => void) => {
        const socketInfo = this.socketsRecord.get(socket.id);
        if (this.socketsRecord.get(socket.id)?.isInMultiplayerMode || !socketInfo) {
          callback(false);
          return;
        }
        
        if (!chessEngine) {
          callback(false); // engine not loaded
          return;
        }

        try {
          difficulty = difficultyNum; // Update difficulty for future games
          chessEngine.setSearchDepth(difficultyNum);
          callback(true);
        } catch (e: any) {
          callback(false);
        }
      }
    );

    socket.on(
      "setAIModel",
      async (aiModel: string, callback: (succeed: boolean) => void) => {
        const socketInfo = this.socketsRecord.get(socket.id);
        if (this.socketsRecord.get(socket.id)?.isInMultiplayerMode || !socketInfo) {
          callback(false);
          return;
        }

        try {
          console.log("changing AI Model");
          let curFen = chessEngine ? chessEngine.getFen() : "";
           if (aiModel === "stockfish") {
            chessEngine = await ChessStockfishModel.loadStockfishEngine(difficulty, curFen);
           }  else if (aiModel === "minimax") {
            chessEngine = await ChessMinimaxModel.create(difficulty, curFen);
           }
          callback(true);
        } catch (e: any) {
          callback(false);
        }
      }
    );

    socket.on("setNewGame", async (callback: (succeed: boolean) => void) => {
      const socketInfo = this.socketsRecord.get(socket.id);
      if (!socketInfo) {
        callback(false);
        return;
      }

      if (socketInfo.isInMultiplayerMode) {
        try {
          socket.to(socketInfo.roomID).emit("setNewGame");
          callback(true);
        } catch (e: any) {
          callback(false);
        }
      } else {
        // AI Mode
        try {
          chessEngine = await ChessStockfishModel.loadStockfishEngine(difficulty);
          callback(true);
        } catch (e: any) {
          callback(false);
        }
      }
    });

    socket.on("disconnect", () => {
      console.info("Disconnect received from: " + socket.id);
      const socketInfo = this.socketsRecord.get(socket.id);
      if (socketInfo) {
        const roomID = socketInfo.roomID;
        socket.to(roomID).emit("opponentDisconnected");

        // This logic is still buggy for multiplayer (deletes room if one player leaves)
        // but it will work for your local testing.
        if (this.roomsRecord.has(roomID)) {
            this.roomsRecord.delete(roomID);
        }
        this.socketsRecord.delete(socket.id);
      }
    });
  };
}
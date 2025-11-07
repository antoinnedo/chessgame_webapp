import "./App.css";
import { SocketContextProvider } from "./ContextProvider/SocketContextProvider";
import { ChessContextProvider } from "./ContextProvider/ChessContextProvider";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MDBFooter } from "mdb-react-ui-kit";
import { VscGithub } from "react-icons/vsc";
import { AccessibilityContextProvider } from "./ContextProvider/AccessibilityContext";
import GameLayout from "./components/GameLayout";

function App() {
  return (
    <div className="app-wrapper">
      <BrowserRouter>
        <Routes>
          {["/", "/:roomID"].map((path, idx) => {
            return (
              <Route
                path={path}
                element={
                  <SocketContextProvider>
                    <ChessContextProvider>
                      <AccessibilityContextProvider>
                          <GameLayout />
                      </AccessibilityContextProvider>
                    </ChessContextProvider>
                  </SocketContextProvider>
                }
                key={idx}
              />
            );
          })}
        </Routes>
      </BrowserRouter>
      <MDBFooter bgColor="white" className="footer text-center text-lg-left p-t-50">
        <div
          className="text-center p-3"
          style={{ backgroundColor: "rgba(100, 100, 100, 0.05)" }}
        >
          &copy; 2023 Copyright:{""}
          <h6>Steve Do, Duong Vo</h6>
          <h6>Accessibility added by Anthony</h6>
          <h6>Find our code on Github! </h6>
          <a
            href="https://github.com/dominhnhut01/chessgame_webapp"
            target="_blank"
            rel="noreferrer"
          >
            <VscGithub size={30} style={{ margin: "4px" }} />
          </a>
        </div>
      </MDBFooter>
    </div>
  );
}

export default App;

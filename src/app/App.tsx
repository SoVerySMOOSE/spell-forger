import { GameBoard } from "../game/ui/GameBoard";
import { useGameStore } from "../game/state/store";

const App = () => {
  const [state, dispatch] = useGameStore();
  return <GameBoard state={state} dispatch={dispatch} />;
};

export default App;

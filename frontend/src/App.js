import React from "react";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import AppRoutes from "./routes/AppRoutes";
import { ConfirmProvider } from "./components/Confirm/ConfirmProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.scss";

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ConfirmProvider>
          <AppRoutes />
        </ConfirmProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;

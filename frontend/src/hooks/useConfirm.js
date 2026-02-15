import { useContext } from "react";
import { useConfirmContext } from "../components/Confirm/ConfirmProvider";

export const useConfirm = () => {
  const ctx = useConfirmContext();
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx.confirm;
};

export default useConfirm;

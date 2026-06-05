import React, { createContext, useContext, useState } from "react";

type GridContextType = {
  gridAvailable: boolean;
  setGridAvailable: (v: boolean) => void;
};

const GridContext = createContext<GridContextType | undefined>(undefined);

export const GridProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [gridAvailable, setGridAvailable] = useState<boolean>(true);
  return (
    <GridContext.Provider value={{ gridAvailable, setGridAvailable }}>
      {children}
    </GridContext.Provider>
  );
};

export const useGrid = () => {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error("useGrid must be used within GridProvider");
  return ctx;
};

export default GridContext;

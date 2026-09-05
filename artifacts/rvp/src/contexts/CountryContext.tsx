import { createContext, useContext, useState, type ReactNode } from "react";

type CountryContextValue = {
  selectedCountryCode: string;
  setSelectedCountryCode: (countryCode: string) => void;
};

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [selectedCountryCode, setSelectedCountryCode] = useState("JAM");

  return (
    <CountryContext.Provider value={{ selectedCountryCode, setSelectedCountryCode }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (!context) throw new Error("useCountry must be used within CountryProvider");
  return context;
}
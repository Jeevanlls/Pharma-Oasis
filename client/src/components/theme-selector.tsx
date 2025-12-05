import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Palette, Check } from "lucide-react";

type ColorTheme = "theme_clinical_blue" | "theme_premium_offwhite" | "theme_tech_slate";
type DarkMode = "light" | "dark";

const colorThemes: { id: ColorTheme; name: string; description: string }[] = [
  { 
    id: "theme_clinical_blue", 
    name: "Clinical Blue", 
    description: "Professional healthcare blue" 
  },
  { 
    id: "theme_premium_offwhite", 
    name: "Premium Off-White", 
    description: "Elegant warm neutral" 
  },
  { 
    id: "theme_tech_slate", 
    name: "Tech Slate", 
    description: "Modern tech aesthetic" 
  },
];

export function ThemeSelector() {
  const [colorTheme, setColorTheme] = useState<ColorTheme>("theme_clinical_blue");
  const [darkMode, setDarkMode] = useState<DarkMode>("light");

  useEffect(() => {
    const savedColorTheme = localStorage.getItem("colorTheme") as ColorTheme | null;
    const savedDarkMode = localStorage.getItem("theme") as DarkMode | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialColorTheme = savedColorTheme || "theme_clinical_blue";
    const initialDarkMode = savedDarkMode || (prefersDark ? "dark" : "light");
    
    setColorTheme(initialColorTheme);
    setDarkMode(initialDarkMode);
    
    document.documentElement.setAttribute("data-theme", initialColorTheme);
    document.documentElement.classList.toggle("dark", initialDarkMode === "dark");
  }, []);

  const handleColorThemeChange = (theme: ColorTheme) => {
    setColorTheme(theme);
    localStorage.setItem("colorTheme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  const toggleDarkMode = () => {
    const newMode = darkMode === "light" ? "dark" : "light";
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode);
    document.documentElement.classList.toggle("dark", newMode === "dark");
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            data-testid="button-theme-selector"
          >
            <Palette className="h-4 w-4" />
            <span className="sr-only">Select color theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {colorThemes.map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => handleColorThemeChange(theme.id)}
              className="flex items-center justify-between cursor-pointer"
              data-testid={`theme-option-${theme.id}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{theme.name}</span>
                <span className="text-xs text-muted-foreground">{theme.description}</span>
              </div>
              {colorTheme === theme.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        data-testid="button-dark-mode-toggle"
      >
        {darkMode === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle dark mode</span>
      </Button>
    </div>
  );
}

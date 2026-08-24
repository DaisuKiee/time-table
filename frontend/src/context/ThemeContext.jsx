import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import i18n from '../i18n';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // light, dark, system
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('Asia/Manila');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [theme]);

  const loadThemeSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authAPI.getSettings();
      const settings = response.data.data;
      
      if (settings.appearance) {
        setTheme(settings.appearance.theme || 'light');
        const lang = settings.appearance.language || 'en';
        setLanguage(lang);
        i18n.changeLanguage(lang); // Sync with i18n
        setTimezone(settings.appearance.timezone || 'Asia/Manila');
      }
    } catch (error) {
      console.error('Load theme error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = () => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      }
      // For light mode, don't add any class - default styles are light
    } else if (theme === 'dark') {
      root.classList.add('dark');
    }
    // For light mode, don't add any class - default styles are light
  };

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const updateLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage); // Update i18n language
  };

  const updateTimezone = (newTimezone) => {
    setTimezone(newTimezone);
  };

  const value = {
    theme,
    language,
    timezone,
    loading,
    updateTheme,
    updateLanguage,
    updateTimezone,
    reloadTheme: loadThemeSettings
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

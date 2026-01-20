'use client';

import { useTranslation as useReactI18nextTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useTranslation = (ns?: string | string[]) => { 
  const { t, i18n, ready } = useReactI18nextTranslation(ns); 

  const changeLanguage = useCallback((lng: string) => {  
    return i18n.changeLanguage(lng);  
  }, [i18n]); 

  return {  
    t,
    i18n,
    ready,
    changeLanguage,
    language: i18n.language, 
  };
};

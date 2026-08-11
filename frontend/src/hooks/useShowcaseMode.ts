"use client"

import { createContext, createElement, useContext } from "react"

const ShowcaseModeContext = createContext(false)

export function ShowcaseModeProvider({
  children,
  enabled,
}: {
  children: React.ReactNode
  enabled: boolean
}) {
  return createElement(ShowcaseModeContext.Provider, { value: enabled }, children)
}

export function useShowcaseMode() {
  return useContext(ShowcaseModeContext)
}

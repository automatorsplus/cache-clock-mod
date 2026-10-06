export type TurnTime = number | null

declare module 'claude-code' {
  interface PluginState {
    'cache-clock': { lastTurnAt: TurnTime; warned: boolean; tick: number; hidden: boolean }
  }
}

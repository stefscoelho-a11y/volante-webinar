/**
 * Tipagem compartilhada da YouTube IFrame API. Existe um unico lugar pra essa
 * declaracao global porque TypeScript nao aceita duas declaracoes
 * conflitantes de `Window.YT` em arquivos diferentes (SalaVideo usa
 * controls:0 + onStateChange, AdminVideoScrubber usa so onReady).
 */
export type YouTubePlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  destroy: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getPlayerState: () => number;
  // Nao documentado oficialmente (por isso opcional), mas estavel ha anos:
  // descarrega modulos do player, como o de legendas.
  unloadModule?: (module: string) => void;
};

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          width?: number | string;
          height?: number | string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
            onApiChange?: (event: { target: YouTubePlayer }) => void;
          };
        },
      ) => YouTubePlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

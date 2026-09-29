import { Audio } from 'expo-av';

// Kept separate from the pure controller so tests need no device or external audio.
export function createPlaybackAdapter(source) {
  let sound = null;
  return {
    async play({onComplete,onError,isCurrent}) {
      try {
        const created = await Audio.Sound.createAsync({uri:source.normal_url},{shouldPlay:false,isLooping:false});
        sound=created.sound;
        if(!isCurrent()){await sound.unloadAsync();sound=null;return;}
        sound.setOnPlaybackStatusUpdate(status=>{
          if(!status.isLoaded){if(status.error)onError();return;}
          if(status.didJustFinish && !status.isLooping)onComplete();
        });
        await sound.playAsync();
      } catch { onError(); }
    },
    async stop() { const current=sound;sound=null;if(current){current.setOnPlaybackStatusUpdate(null);await current.unloadAsync();} },
  };
}

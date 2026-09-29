import React,{memo,useEffect,useRef} from 'react';
import {Animated,StyleSheet,Text,TouchableOpacity,View} from 'react-native';
const BEADS=Array.from({length:108},(_,i)=>{const a=i/108*Math.PI*2-Math.PI/2;return {left:`${50+45*Math.cos(a)}%`,top:`${50+45*Math.sin(a)}%`};});
export default memo(function DigitalMala({count,onPress,disabled}) {
  const glow=useRef(new Animated.Value(1)).current,bead=count%108;
  useEffect(()=>{const completed=count>0&&count%108===0;const motion=Animated.sequence([Animated.timing(glow,{toValue:completed?1.09:1.03,duration:completed?400:150,useNativeDriver:true}),Animated.timing(glow,{toValue:1,duration:completed?900:250,useNativeDriver:true})]);motion.start();return()=>motion.stop();},[count,glow]);
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Digital mala, ${bead} of 108 beads. Count one repetition`} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={s.touch}>
    <Animated.View pointerEvents="none" style={[s.mala,{transform:[{scale:glow}]}]}>{BEADS.map((position,i)=><View key={i} style={[s.bead,position,i<bead&&s.done,i===bead&&s.current]}/>)}
      <View style={s.center}><Text style={s.number}>{bead}</Text><Text style={s.label}>of 108 beads</Text><Text style={s.hint}>{count>0&&bead===0?'A 108-bead mala is complete':disabled?'Follow your practice':'Tap once for each repetition'}</Text></View>
    </Animated.View></TouchableOpacity>;
});
const s=StyleSheet.create({touch:{width:'100%',maxWidth:330,aspectRatio:1,alignSelf:'center',marginVertical:18},mala:{flex:1},bead:{position:'absolute',width:6,height:6,marginLeft:-3,marginTop:-3,borderRadius:4,backgroundColor:'#59412D'},done:{backgroundColor:'#F4B76D'},current:{backgroundColor:'#FFF3CF',width:10,height:10,marginLeft:-5,marginTop:-5,borderRadius:5},center:{position:'absolute',top:'28%',left:'18%',right:'18%',alignItems:'center'},number:{fontSize:46,color:'#F4B76D',fontWeight:'700'},label:{color:'#E4D0BA',fontSize:16},hint:{color:'#BEA58E',fontSize:12,textAlign:'center',marginTop:10}});

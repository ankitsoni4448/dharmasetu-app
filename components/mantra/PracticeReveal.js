import React from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import experience from '../../utils/mantraExperience';
export default function PracticeReveal({practice,artwork}) {
  const {units,fraction}=experience.goalProgress(practice),approved=experience.approvedArtwork(artwork,practice.mantra_id);
  return <View style={s.card} accessibilityLabel={`Daily practice progress ${Math.round(fraction*100)} percent`}>
    {approved?<Image accessibilityLabel="Reviewed devotional artwork" source={{uri:approved.image_url}} resizeMode="contain" style={[s.art,{opacity:.12+.88*fraction}]}/>:<View style={s.light}><View style={[s.glow,{opacity:.12+.88*fraction,transform:[{scale:.65+.35*fraction}]}]}/><Text style={s.lightText}>A moment of light</Text></View>}
    <View style={s.track}><View style={[s.fill,{width:`${fraction*100}%`}]}/></View><Text style={s.text}>{units} / {practice.goal_value} {practice.goal_type==='MALAS'?'completed 108-bead malas':practice.goal_type==='SESSIONS'?'completed sessions':'repetitions'} today</Text></View>;
}
const s=StyleSheet.create({card:{padding:16,borderRadius:20,backgroundColor:'#24160B',marginVertical:12},art:{height:150,width:'100%'},light:{height:100,alignItems:'center',justifyContent:'center'},glow:{width:72,height:72,borderRadius:36,backgroundColor:'#F4BF72',position:'absolute'},lightText:{color:'#FFF1D8',fontSize:14},track:{height:5,backgroundColor:'#59412D',borderRadius:4,overflow:'hidden',marginTop:12},fill:{height:5,backgroundColor:'#F4BF72'},text:{textAlign:'center',color:'#D8C4AC',marginTop:10,lineHeight:20}});

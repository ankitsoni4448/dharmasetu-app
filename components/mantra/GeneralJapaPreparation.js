import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import preparation from '../../utils/generalJapaPreparation';

const { GENERAL_JAPA_PREPARATION } = preparation;

export default function GeneralJapaPreparation({ summary = false }) {
  const items = summary ? GENERAL_JAPA_PREPARATION.items.filter(item => item.summary) : GENERAL_JAPA_PREPARATION.items;
  return <View>{items.map(item => <View key={item.id} style={s.item}><Text style={s.bullet}>•</Text><View style={s.copy}><Text style={s.hi}>{item.hi}</Text><Text style={s.en}>{item.en}</Text></View></View>)}</View>;
}

const s=StyleSheet.create({item:{marginTop:10,flexDirection:'row',gap:9},bullet:{fontSize:18,color:'#F4A261',lineHeight:24},copy:{flex:1},hi:{fontSize:14,lineHeight:23,color:'#F7E7D9'},en:{fontSize:12,lineHeight:19,color:'#C9B3A4',marginTop:2}});

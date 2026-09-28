import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import preparation from '../../utils/generalJapaPreparation';

const { GENERAL_JAPA_PREPARATION, PREPARATION_CATEGORY_LABELS } = preparation;

export default function GeneralJapaPreparation({ summary = false }) {
  const items = summary ? GENERAL_JAPA_PREPARATION.items.filter(item => item.summary) : GENERAL_JAPA_PREPARATION.items;
  return <View><Text style={s.disclaimer}>{GENERAL_JAPA_PREPARATION.disclaimerHi}</Text><Text style={s.disclaimer}>{GENERAL_JAPA_PREPARATION.disclaimerEn}</Text>
    {items.map(item => <View key={item.id} style={s.item}><Text style={s.category}>{PREPARATION_CATEGORY_LABELS[item.category]}</Text>
      <Text style={s.hi}>{item.hi}</Text><Text style={s.en}>{item.en}</Text></View>)}</View>;
}

const s=StyleSheet.create({disclaimer:{fontSize:11,lineHeight:17,color:'#BFA99A',marginBottom:8},item:{marginTop:10},category:{fontSize:9,fontWeight:'800',letterSpacing:.7,textTransform:'uppercase',color:'#F4A261'},hi:{fontSize:14,lineHeight:23,color:'#F7E7D9',marginTop:3},en:{fontSize:12,lineHeight:19,color:'#C9B3A4',marginTop:3}});

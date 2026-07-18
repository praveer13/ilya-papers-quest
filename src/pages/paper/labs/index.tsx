import type { ComponentType } from 'react';
import type { LabProps } from './shared';
import { CharRnnLab, BengioLab, PascanuLab, LstmLab, GruLab, RnnDropoutLab, ComplexodynamicsLab } from './track1';
import {
  Seq2SeqLab,
  BahdanauLab,
  NeuralConvLab,
  GravesHandwritingLab,
  OrderMattersLab,
  PointerNetLab,
  TransformerLab,
  AnnotatedTransformerLab,
  RelationalRnnLab,
  RelationalReasoningLab,
  NtmLab,
} from './track2';

/**
 * Lab registry — one bespoke interactive per paper, keyed by slug.
 * Returns undefined for slugs whose lab belongs to another content pack;
 * the Paper page renders the DemoFrame fallback in that case.
 */
const LABS: Record<string, ComponentType<LabProps>> = {
  // track 1
  'char-rnn': CharRnnLab,
  'bengio-1994': BengioLab,
  'pascanu-2013': PascanuLab,
  'lstm-1997': LstmLab,
  'gru-2014': GruLab,
  'rnn-dropout-2014': RnnDropoutLab,
  complexodynamics: ComplexodynamicsLab,
  // track 2
  'seq2seq-2014': Seq2SeqLab,
  'bahdanau-2014': BahdanauLab,
  'neural-conv-2015': NeuralConvLab,
  'graves-handwriting-2013': GravesHandwritingLab,
  'order-matters-2015': OrderMattersLab,
  'pointer-networks-2015': PointerNetLab,
  'transformer-2017': TransformerLab,
  'annotated-transformer': AnnotatedTransformerLab,
  'relational-rnn-2018': RelationalRnnLab,
  'relational-reasoning-2017': RelationalReasoningLab,
  'ntm-2014': NtmLab,
};

export function getLab(slug: string): ComponentType<LabProps> | undefined {
  return LABS[slug];
}

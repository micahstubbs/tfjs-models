/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/**
 * Utility functions for training and transfer learning of the speech-commands
 * model.
 */

import * as tf from '@tensorflow/tfjs';

/**
 * Split feature and target tensors into train and validation (val) splits.
 *
 * Given sufficent number of examples, the train and val sets will be
 * balanced with respect to the classes.
 *
 * @param xs Features tensor, of shape [numExamples, ...].
 * @param ys Targets tensors, of shape [numExamples, numClasses]. Assumed to be
 *   one-hot categorical encoding.
 * @param valSplit A number > 0 and < 1, fraction of examples to use
 *   as the validation set.
 * @returns trainXs: training features tensor; trainYs: training targets
 *   tensor; valXs: validation features tensor; valYs: validation targets
 *   tensor.
 */
export function balancedTrainValSplit(
    xs: tf.Tensor, ys: tf.Tensor, valSplit: number): {
  trainXs: tf.Tensor,
  trainYs: tf.Tensor,
  valXs: tf.Tensor,
  valYs: tf.Tensor
} {
  tf.util.assert(
      valSplit > 0 && valSplit < 1,
      `validationSplit is expected to be >0 and <1, ` +
          `but got ${valSplit}`);

  return tf.tidy(() => {
    const classIndices = ys.argMax(-1).dataSync();

    const indicesByClasses: number[][] = [];
    for (let i = 0; i < classIndices.length; ++i) {
      const classIndex = classIndices[i];
      if (indicesByClasses[classIndex] == null) {
        indicesByClasses[classIndex] = [];
      }
      indicesByClasses[classIndex].push(i);
    }
    const numClasses = indicesByClasses.length;

    const trainIndices: number[] = [];
    const valIndices: number[] = [];

    // Randomly shuffle the list of indices in each array.
    indicesByClasses.map(classIndices => tf.util.shuffle(classIndices));
    for (let i = 0; i < numClasses; ++i) {
      const classIndices = indicesByClasses[i];
      const cutoff = Math.round(classIndices.length * (1 - valSplit));
      for (let j = 0; j < classIndices.length; ++j) {
        if (j < cutoff) {
          trainIndices.push(classIndices[j]);
        } else {
          valIndices.push(classIndices[j]);
        }
      }
    }

    const trainXs = tf.gather(xs, trainIndices);
    const trainYs = tf.gather(ys, trainIndices);
    const valXs = tf.gather(xs, valIndices);
    const valYs = tf.gather(ys, valIndices);
    return {trainXs, trainYs, valXs, valYs};
  });
}

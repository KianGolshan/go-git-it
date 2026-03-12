import React from 'react';
import { Composition } from 'remotion';
import { CoreProductDemo } from './demo1/CoreProductDemo';
import { FeatureDemo } from './demo2/FeatureDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CoreProductDemo"
        component={CoreProductDemo}
        durationInFrames={1110}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="FeatureDemo"
        component={FeatureDemo}
        durationInFrames={1230}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};

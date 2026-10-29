import {useRef} from 'react';
import useMotionFeedback from '../hooks/useMotionFeedback';
export default function MotionValue({value,children=value,as:Tag='output',...props}){const ref=useRef(null);useMotionFeedback(ref,value);return <Tag ref={ref} {...props}>{children}</Tag>;}

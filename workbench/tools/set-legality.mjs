#!/usr/bin/env node
import {validateSetRow} from './champions-engine.mjs';
import {runBatch} from './batch-io.mjs';
await runBatch(validateSetRow);

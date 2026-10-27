import assert from "node:assert/strict";
import test from "node:test";
import apiClient from "./client.js";
import { retryInstanceCleanup } from "./admin.js";
import { canRetryCleanup, cleanupRetryNotice, cleanupRetryError } from "../features/admin/utils/adminAttention.js";

test("cleanup retry sends one POST with an empty JSON object and keeps service failures", async () => {
  const previous=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:()=>null}});
  const adapter=apiClient.defaults.adapter;
  const calls=[];
  apiClient.defaults.adapter=async config=>{
    calls.push(config);
    assert.equal(config.method,"post");
    assert.equal(config.url,"/admin/instances/a%2Fb/retry-cleanup");
    assert.deepEqual(JSON.parse(config.data),{});
    throw Object.assign(new Error("scheduler disconnected"),{response:{status:503,data:{code:"SCHEDULER_UNAVAILABLE"}},config});
  };
  try {
    await assert.rejects(retryInstanceCleanup("a/b"),error=>error.response.status===503);
    assert.equal(calls.length,1);
  } finally {
    apiClient.defaults.adapter=adapter;
    if(previous) Object.defineProperty(globalThis,"localStorage",previous);
    else delete globalThis.localStorage;
  }
});

test("only FAILED offers retry; acknowledgement does not claim cleanup or reservation release",()=>{
  assert.equal(canRetryCleanup({status:"FAILED"}),true);
  for(const status of ["RUNNING","CLEANUP_PENDING","CLEANED","STOPPING","EXPIRED",undefined]) {
    assert.equal(canRetryCleanup({status}),false);
  }
  const accepted={code:"SUCCESS",data:{instance_id:"owned",status:"CLEANUP_PENDING"}};
  assert.match(cleanupRetryNotice(accepted,"owned"),/접수됐습니다/);
  for(const data of [null,{instance_id:"foreign",status:"CLEANUP_PENDING"},
    {instanceId:"owned",status:"CLEANUP_PENDING"},{instance_id:"owned",status:"CLEANED"},
    {instance_id:"owned",status:"FAILED"}]) {
    assert.throws(()=>cleanupRetryNotice({code:"SUCCESS",data},"owned"),/결과를 확인하지 못했습니다/);
  }
});

test("lost responses and missing remote state give an actionable failure message",()=>{
  assert.match(cleanupRetryError(new Error("Network Error")),/결과를 확인하지 못했습니다/);
  for(const code of ["INSTANCE_NOT_FOUND","INVALID_STATE_TRANSITION","SCHEDULER_UNAVAILABLE"]) {
    const message=cleanupRetryError({response:{data:{code}}});
    assert.match(message,/확인/);
    assert.doesNotMatch(message,/정리 완료됐습니다/);
  }
});

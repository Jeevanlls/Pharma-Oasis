import test from "node:test";
import assert from "node:assert/strict";
import { prepareCatalogue,canonicalReference,type AppCatalogueRow } from "../server/catalogue-sync-plan";
import { publicProduct,isBarcodeReference } from "../shared/public-catalogue";
const row=(id:number,ean:string,patch:Partial<AppCatalogueRow>={}):AppCatalogueRow=>({id,ean,name:"Product",brand:"Brand",category:"Vitamins",pack_size:"30",case_size:6,status:"NON_PHARMACEUTICAL",is_archived:false,...patch});
test("EAN identity keeps leading zeros and picks the exact reference without discarding source IDs",()=>{
 const p=prepareCatalogue([row(1,"0 123456789012",{brand:"Legacy"}),row(2,"0123456789012")],[{id:90,ean:"0123456789012",sku:"old-sku",is_active:true}]);
 assert.equal(p.products.length,1);assert.equal(p.products[0].reference,"0123456789012");assert.equal(p.products[0].app_id,2);assert.equal(p.products[0].existing_id,90);assert.deepEqual(p.products[0].app_ids,[2,1]);assert.match(p.products[0].issues.join(" "),/different taxonomy/);
});
test("archived source rows are excluded, incomplete retained rows are flagged, long references stay intact",()=>{
 const key="NEW-"+"x".repeat(120);const p=prepareCatalogue([row(1,"5000000000001",{is_archived:true}),row(2,key,{brand:null,category:null,status:""})],[]);
 assert.equal(p.products.length,1);assert.equal(p.products[0].reference,key);assert.equal(p.products[0].brand,"Brand to be confirmed");assert.equal(p.products[0].classification,null);assert.equal(p.products[0].issues.length,4);assert.equal(isBarcodeReference(key),false);
});
test("source identity changes preserve website ID and do not claim one record twice",()=>{
 const existing=[{id:77,ean:"old",sku:"APP-1",is_active:true,inventory_product_id:1,inventory_reference:"old"}];
 assert.equal(prepareCatalogue([row(1,"new")],existing).products[0].existing_id,77);
 assert.throws(()=>prepareCatalogue([row(1,"new"),row(2,"old")],existing),/claim/);
});
test("empty and malformed source reads stop the import",()=>{
 assert.throws(()=>prepareCatalogue([],[]),/Empty/);assert.throws(()=>prepareCatalogue([row(1," ")],[]),/Invalid/);
 assert.equal(canonicalReference(" 00123\n456 "),"00123456");
});
test("public catalogue allowlist excludes all price, supplier and source audit fields",()=>{
 const result=publicProduct({id:1,ean:"0123456789012",productName:"Example",activeCostPrice:"4.99",wholesalePrice:"9.99",rrp:"19.99",notesInternal:"private",inventoryDataIssues:["review"],inventoryProductIds:[1,2],password:"not public"});
 assert.equal(result.ean,"0123456789012");for(const key of ["activeCostPrice","wholesalePrice","rrp","notesInternal","inventoryDataIssues","inventoryProductIds","password"])assert.equal(key in result,false);
});

import {quoteQuantity} from "../shared/quote-quantity";
test("quote cases convert to units once and unknown case sizes are rejected",()=>{
 assert.equal(quoteQuantity({quantity:"3",unit:"cases",product:{caseSize:12}}),36);
 assert.equal(quoteQuantity({quantity:"36",unit:"units",product:{caseSize:12}}),36);
 for(const quantity of ["0","-2","1.5","","1000001"])
  assert.throws(()=>quoteQuantity({quantity,unit:"units",product:{}}));
 assert.throws(()=>quoteQuantity({quantity:"1",unit:"cases",product:{}}));
 assert.throws(()=>quoteQuantity({quantity:"100000",unit:"cases",product:{caseSize:12}}));
});

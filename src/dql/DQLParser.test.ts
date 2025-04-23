import { describe, it, expect } from 'vitest';
import { parseDQL, parseDQLWithErrorHandling } from './DQLParser.js';

describe('DQLParser - Orders queries', () => {
  it('should parse basic filter + project query', () => {
    const query = `
      Url("wss://example.com/orders") 
      | filter $.total > 100 
      | project { id: $.id, customer: $.customer.name }
    `;
    // const cst = parseDQL(query);
    const cst = parseDQLWithErrorHandling(query);
    // console.log("CST:", JSON.stringify(cst, null, 2));
    expect(cst).toBeDefined();
    expect(cst!.cst.name).toBe("dql");
    // Validate that the CST has a source and 2 action blocks
    expect(cst!.cst.children.source).toBeDefined();
    expect(cst!.cst.children.actionBlock).toHaveLength(2);
  });

  // it('should parse multiple actions with do query', () => {
  //   const query = `
  //     Url("wss://example.com/orders") 
  //     | when $.status = "pending" 
  //     | select { orderId: $.id, items: $.items.length } 
  //     | do log("file://pending-orders.log"), alert("email://ops@shop.com")
  //   `;
  //   const cst = parseDQLWithErrorHandling(query);
  //   expect(cst).toBeDefined();
  //   // Expect three action blocks: for filter (when), project (select) and do
  //   expect(cst!.cst.children.actionBlock).toHaveLength(3);

  //   // Check that the "do" action includes a handlerList containing two handlers
  //   const doBlock = cst!.cst.children.actionBlock.find((block: any) =>
  //     block.children && block.children.Do
  //   );
  //   expect(doBlock).toBeDefined();
  //   if (doBlock) {
  //     const handlerList = doBlock.children.handlerList[0];
  //     expect(handlerList.children.handler).toHaveLength(2);

  //     expect(handlerList.children.handler[0].type).toBe("log");
  //     expect(handlerList.children.handler[1].type).toBe("alert");
  //     expect(handlerList.children.handler[0].args[0].value).toBe("file://pending-orders.log");
  //     expect(handlerList.children.handler[1].args[0].value).toBe("email://ops@shop.com");
  //   } else {
  //     throw new Error("doBlock is undefined");
  //   }

  //   expect(handlerList.children.handler[0].type).toBe("log");
  //   expect(handlerList.children.handler[1].type).toBe("alert");
  //   expect(handlerList.children.handler[0].args[0].value).toBe("file://pending-orders.log");
  //   expect(handlerList.children.handler[1].args[0].value).toBe("email://ops@shop.com");
  // });

  // it('should parse alternate keywords (when, select, action) query', () => {
  //   const query = `
  //     Url("https://orders.io/stream") 
  //     | when $.customer.vip = true 
  //     | select { name: $.customer.name, total: $.total } 
  //     | action alert("slack://vip-alerts")
  //   `;
  //   const cst = parseDQL(query);
  //   expect(cst).toBeDefined();
  //   expect(cst.children.source).toBeDefined();
  //   // Expect three action blocks for when, select, and action (doBlock)
  //   expect(cst.children.actionBlock).toHaveLength(3);
  // });

  // it('should parse complex JSONata expression query', () => {
  //   const query = `
  //     Url("https://store/api/orders") 
  //     | filter $.items[*.price > 50].length > 0 
  //     | project { total: $.total, premiumItems: $.items[price > 50] }
  //   `;
  //   const cst = parseDQL(query);
  //   expect(cst).toBeDefined();
  //   expect(cst.children.source).toBeDefined();
  //   // Expect two action blocks for filter and project
  //   expect(cst.children.actionBlock).toHaveLength(2);
  // });

  // it('should parse minimal query with only one step', () => {
  //   const query = `
  //     Url("wss://fastfeed") 
  //     | do log("file://events.log")
  //   `;
  //   const cst = parseDQL(query);
  //   expect(cst).toBeDefined();
  //   expect(cst.children.source).toBeDefined();
  //   // Only one action block which is doBlock
  //   expect(cst.children.actionBlock).toHaveLength(1);
  // });

  // it('should return null for a malformed JSONata expression', () => {
  //   const query = `
  //     Url("http://bad-source") 
  //     | filter $..invalid syntax @!
  //   `;
  //   // Using the error-handling parser method to catch the syntax problem.
  //   const cst = parseDQLWithErrorHandling(query);
  //   expect(cst).toBeNull();
  // });
});
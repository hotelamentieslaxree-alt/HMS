import { db } from '../src/lib/db';

async function seed() {
  let p = await db.property.findFirst({ orderBy: { createdAt: "asc" } });
  if (p) { console.log("Property exists, skipping seed"); await db.$disconnect(); return; }
  p = await db.property.create({
    data: { name: "The Aurelian Grand", code: "TAG", city: "Mumbai", state: "Maharashtra", country: "India", timezone: "Asia/Calcutta", currency: "INR", starRating: 5, totalRooms: 26, checkInTime: "14:00", checkOutTime: "12:00", businessDate: new Date() },
  });
  const propertyId = p.id;
  console.log("Property created");

  await db.roomCategory.createMany({ data: [
    { id: "cat-deluxe", propertyId, name: "Deluxe Room", code: "DLX", baseRate: 4500, maxAdults: 2, amenities: JSON.stringify(["WiFi","TV","AC","Mini Bar"]) },
    { id: "cat-suite", propertyId, name: "Executive Suite", code: "EXE", baseRate: 8500, maxAdults: 3, amenities: JSON.stringify(["WiFi","TV","AC","Mini Bar","Bathtub"]) },
    { id: "cat-premium", propertyId, name: "Premium Room", code: "PRM", baseRate: 6500, maxAdults: 2, amenities: JSON.stringify(["WiFi","TV","AC","Mini Bar","Coffee Machine"]) },
    { id: "cat-standard", propertyId, name: "Standard Room", code: "STD", baseRate: 3000, maxAdults: 2, amenities: JSON.stringify(["WiFi","TV","AC"]) },
  ]});
  console.log("Room categories done");

  const roomData: any[] = [];
  for (const cfg of [{catId:"cat-deluxe",prefix:"1",count:10,floor:1},{catId:"cat-suite",prefix:"2",count:8,floor:2},{catId:"cat-premium",prefix:"3",count:6,floor:3},{catId:"cat-standard",prefix:"4",count:2,floor:4}]) {
    for (let i=1;i<=cfg.count;i++) roomData.push({propertyId,categoryId:cfg.catId,roomNumber:`${cfg.prefix}${String(i).padStart(2,"0")}`,floor:cfg.floor,currentStatus:i<=4?"occupied_clean":i===5?"out_of_order":"vacant_clean"});
  }
  await db.room.createMany({ data: roomData });
  console.log("Rooms done");

  await db.department.createMany({ data: ["Management","Front Office","Housekeeping","F&B","Finance","Engineering","Revenue","HR","Sales","Marketing"].map(name => ({propertyId,name,code:name.slice(0,3).toUpperCase()})) });
  console.log("Departments done");

  const roles = [
    {email:"owner@aurelian.com",firstName:"Vikram",lastName:"Mehta",role:"owner",department:"Management"},
    {email:"gm@aurelian.com",firstName:"Priya",lastName:"Sharma",role:"gm",department:"Management"},
    {email:"fom@aurelian.com",firstName:"Rahul",lastName:"Kumar",role:"fom",department:"Front Office"},
    {email:"receptionist@aurelian.com",firstName:"Anita",lastName:"Patel",role:"receptionist",department:"Front Office"},
    {email:"hk_mgr@aurelian.com",firstName:"Sunita",lastName:"Devi",role:"hk_mgr",department:"Housekeeping"},
    {email:"fb_mgr@aurelian.com",firstName:"Chef",lastName:"Rajan",role:"fb_mgr",department:"F&B"},
    {email:"fin_mgr@aurelian.com",firstName:"Arun",lastName:"Gupta",role:"fin_mgr",department:"Finance"},
    {email:"eng_mgr@aurelian.com",firstName:"Deepak",lastName:"Singh",role:"eng_mgr",department:"Engineering"},
    {email:"rev_mgr@aurelian.com",firstName:"Neha",lastName:"Jain",role:"rev_mgr",department:"Revenue"},
    {email:"hr_mgr@aurelian.com",firstName:"Meera",lastName:"Reddy",role:"hr_mgr",department:"HR"},
    {email:"sales_mgr@aurelian.com",firstName:"Raj",lastName:"Malhotra",role:"sales_mgr",department:"Sales"},
    {email:"mkt_mgr@aurelian.com",firstName:"Kavita",lastName:"Nair",role:"mkt_mgr",department:"Marketing"},
    {email:"waiter@aurelian.com",firstName:"Amit",lastName:"Kumar",role:"waiter",department:"F&B"},
    {email:"technician@aurelian.com",firstName:"Sunil",lastName:"Yadav",role:"technician",department:"Engineering"},
    {email:"hk_attendant@aurelian.com",firstName:"Lakshmi",lastName:"Bai",role:"hk_attendant",department:"Housekeeping"},
    {email:"sales_exec@aurelian.com",firstName:"Vivek",lastName:"Rao",role:"sales_exec",department:"Sales"},
    {email:"mkt_exec@aurelian.com",firstName:"Pooja",lastName:"Das",role:"mkt_exec",department:"Marketing"},
    {email:"purchase_mgr@aurelian.com",firstName:"Ramesh",lastName:"Kumar",role:"purchase_mgr",department:"Finance"},
  ];
  await db.user.createMany({ data: roles.map((r,i) => ({propertyId,email:r.email,firstName:r.firstName,lastName:r.lastName,role:r.role,phone:`+91-98765${String(1000+i).slice(-5)}`})) });
  const deptRecords = await db.department.findMany({ where: { propertyId } });
  const deptMap: any = {};
  for (const d of deptRecords) deptMap[d.name] = d.id;
  for (const r of roles) await db.user.updateMany({ where: { propertyId, email: r.email }, data: { departmentId: deptMap[r.department] ?? null } });
  console.log("Users done");

  const now = new Date();
  await db.ratePlan.createMany({ data: [
    {propertyId,name:"Standard Rate",code:"RACK",mealPlan:"ep",validFrom:now,validTo:new Date(now.getTime()+365*86400000)},
    {propertyId,name:"Suite Rate",code:"SUITE",mealPlan:"cp",validFrom:now,validTo:new Date(now.getTime()+365*86400000)},
  ]});
  console.log("Rate plans done");

  await db.vendor.createMany({ data: [
    {propertyId,name:"Linen Solutions Pvt Ltd",category:"amenity",contactPerson:"Ramesh Kumar",phone:"+91-98765-00111",email:"sales@linensol.com",rating:4,paymentTerms:"Net 30",isActive:true},
    {propertyId,name:"CleanPro Chemicals",category:"amenity",contactPerson:"Anita Sharma",phone:"+91-98765-00222",email:"orders@cleanpro.in",rating:4,paymentTerms:"Net 15",isActive:true},
    {propertyId,name:"Premium Supplies Co",category:"general",contactPerson:"Vikram Patel",phone:"+91-98765-00333",email:"info@premiumsupplies.com",rating:5,paymentTerms:"Net 30",isActive:true},
    {propertyId,name:"TechKey Solutions",category:"maintenance",contactPerson:"Priya Nair",phone:"+91-98765-00444",email:"support@techkey.in",rating:4,paymentTerms:"Net 15",isActive:true},
    {propertyId,name:"Coffee Bean Traders",category:"food",contactPerson:"Sunil Rao",phone:"+91-98765-00555",email:"supply@coffeebean.com",rating:5,paymentTerms:"COD",isActive:true},
    {propertyId,name:"Fresh Farm Produce",category:"food",contactPerson:"Kavita Joshi",phone:"+91-98765-00666",email:"orders@freshfarm.in",rating:4,paymentTerms:"Net 7",isActive:true},
    {propertyId,name:"AquaPure Beverages",category:"beverage",contactPerson:"Deepak Mehta",phone:"+91-98765-00777",email:"bulk@aquapure.com",rating:4,paymentTerms:"Net 15",isActive:true},
    {propertyId,name:"SafeGuard Equipment",category:"maintenance",contactPerson:"Raj Malhotra",phone:"+91-98765-00888",email:"sales@safeguard.co.in",rating:3,paymentTerms:"Net 30",isActive:true},
  ]});
  console.log("Vendors done");

  const outlets: any[] = [];
  for (const o of [{name:"Spice Garden",code:"SG",type:"restaurant",tableCount:12,isActive:true},{name:"The Royal Bar",code:"RB",type:"bar",tableCount:8,isActive:true},{name:"Café Aroma",code:"CA",type:"cafe",tableCount:6,isActive:true},{name:"Room Service",code:"RS",type:"room_service",tableCount:0,isActive:true}]) {
    const outlet = await db.outlet.create({ data: { propertyId, name: o.name, code: o.code, type: o.type, tableCount: o.tableCount, isActive: o.isActive } });
    outlets.push(outlet);
    for (let i=1;i<=o.tableCount;i++) await db.restaurantTable.create({ data: { outletId:outlet.id,tableNumber:String(i),capacity:i<=2?2:i<=6?4:6 } });
  }
  const sg = outlets[0];
  const catS = await db.menuCategory.create({data:{outletId:sg.id,name:"Starters",sortOrder:0}});
  const catM = await db.menuCategory.create({data:{outletId:sg.id,name:"Main Course",sortOrder:1}});
  const catB = await db.menuCategory.create({data:{outletId:sg.id,name:"Beverages",sortOrder:2}});
  const catD = await db.menuCategory.create({data:{outletId:sg.id,name:"Desserts",sortOrder:3}});
  await db.menuItem.createMany({data:[
    {categoryId:catS.id,name:"Chicken Seekh Kebab",price:550,itemType:"food",dietType:"non_veg",isAvailable:true},
    {categoryId:catS.id,name:"Paneer Tikka",price:450,itemType:"food",dietType:"veg",isAvailable:true},
    {categoryId:catM.id,name:"Butter Chicken",price:650,itemType:"food",dietType:"non_veg",isAvailable:true},
    {categoryId:catM.id,name:"Paneer Tikka Masala",price:550,itemType:"food",dietType:"veg",isAvailable:true},
    {categoryId:catM.id,name:"Dal Makhani",price:450,itemType:"food",dietType:"veg",isAvailable:true},
    {categoryId:catM.id,name:"Mutton Biryani",price:800,itemType:"food",dietType:"non_veg",isAvailable:true},
    {categoryId:catB.id,name:"Mineral Water",price:100,itemType:"beverage",dietType:"veg",isAvailable:true},
    {categoryId:catB.id,name:"Fresh Lime Soda",price:180,itemType:"beverage",dietType:"veg",isAvailable:true},
    {categoryId:catB.id,name:"Masala Chai",price:120,itemType:"beverage",dietType:"veg",isAvailable:true},
    {categoryId:catD.id,name:"Gulab Jamun",price:250,itemType:"food",dietType:"veg",isAvailable:true},
    {categoryId:catD.id,name:"Rasmalai",price:300,itemType:"food",dietType:"veg",isAvailable:true},
  ]});
  console.log("Outlets + Menu done");

  const guests: any[] = [];
  for (const g of [
    {title:"Mr",firstName:"Rajesh",lastName:"Kumar",email:"rajesh.kumar@email.com",phone:"+91-98765-10001",vipStatus:true,loyaltyTier:"gold",nationality:"IN"},
    {title:"Ms",firstName:"Priya",lastName:"Nair",email:"priya.nair@email.com",phone:"+91-98765-10002",vipStatus:false,loyaltyTier:"silver",nationality:"IN"},
    {title:"Dr",firstName:"Anil",lastName:"Mehta",email:"anil.mehta@email.com",phone:"+91-98765-10003",vipStatus:true,loyaltyTier:"platinum",nationality:"IN"},
    {title:"Ms",firstName:"Sneha",lastName:"Patel",email:"sneha.patel@email.com",phone:"+91-98765-10004",vipStatus:false,loyaltyTier:"silver",nationality:"IN"},
    {title:"Mr",firstName:"John",lastName:"Smith",email:"john.smith@email.com",phone:"+44-20-12345678",vipStatus:false,loyaltyTier:"none",nationality:"GB"},
    {title:"Mrs",firstName:"Aisha",lastName:"Khan",email:"aisha.khan@email.com",phone:"+91-98765-10006",vipStatus:true,loyaltyTier:"gold",nationality:"IN"},
  ]) guests.push(await db.guest.create({data:g}));
  console.log("Guests done");

  const today = new Date();
  const allRooms = await db.room.findMany({where:{propertyId}});
  const cats = await db.roomCategory.findMany({where:{propertyId}});
  const rp = await db.ratePlan.findFirst({where:{propertyId}});
  const occRooms = allRooms.filter(r=>r.currentStatus==="occupied_clean");
  const vacRooms = allRooms.filter(r=>r.currentStatus==="vacant_clean");
  for (const r of [
    {primaryGuestId:guests[0].id,categoryId:cats[0].id,roomId:occRooms[0]?.id,ratePlanId:rp?.id,bookingSource:"direct",status:"checked_in",ratePerNight:6500,totalNights:3,checkInDate:new Date(today.getTime()-2*86400000),checkOutDate:new Date(today.getTime()+86400000),actualCheckIn:new Date(today.getTime()-2*86400000),adults:2,confirmationNumber:"AUR-1501"},
    {primaryGuestId:guests[1].id,categoryId:cats[1]?.id??cats[0].id,roomId:occRooms[1]?.id,ratePlanId:rp?.id,bookingSource:"booking_com",status:"checked_in",ratePerNight:8500,totalNights:2,checkInDate:new Date(today.getTime()-86400000),checkOutDate:new Date(today.getTime()+86400000),actualCheckIn:new Date(today.getTime()-86400000),adults:2,otaCommissionPercent:15,confirmationNumber:"AUR-1502"},
    {primaryGuestId:guests[2].id,categoryId:cats[0].id,roomId:occRooms[2]?.id,ratePlanId:rp?.id,bookingSource:"direct",status:"checked_in",ratePerNight:6500,totalNights:5,checkInDate:new Date(today.getTime()-86400000),checkOutDate:new Date(today.getTime()+4*86400000),actualCheckIn:new Date(today.getTime()-86400000),adults:1,confirmationNumber:"AUR-1503"},
    {primaryGuestId:guests[3].id,categoryId:cats[0].id,roomId:occRooms[3]?.id,ratePlanId:rp?.id,bookingSource:"walk_in",status:"checked_in",ratePerNight:4500,totalNights:1,checkInDate:today,checkOutDate:new Date(today.getTime()+86400000),actualCheckIn:today,adults:2,confirmationNumber:"AUR-1504"},
    {primaryGuestId:guests[4].id,categoryId:cats[0].id,roomId:vacRooms[0]?.id,ratePlanId:rp?.id,bookingSource:"expedia",status:"confirmed",ratePerNight:6500,totalNights:3,checkInDate:today,checkOutDate:new Date(today.getTime()+3*86400000),adults:1,otaCommissionPercent:18,confirmationNumber:"AUR-1505"},
    {primaryGuestId:guests[5].id,categoryId:cats[1]?.id??cats[0].id,roomId:vacRooms[1]?.id,ratePlanId:rp?.id,bookingSource:"direct",status:"confirmed",ratePerNight:8500,totalNights:4,checkInDate:new Date(today.getTime()+86400000),checkOutDate:new Date(today.getTime()+5*86400000),adults:2,confirmationNumber:"AUR-1506"},
  ]) {
    const resv = await db.reservation.create({data:{propertyId,...r}});
    const folio = await db.folio.create({data:{reservationId:resv.id,folioNumber:`F-${resv.confirmationNumber}-0`,folioType:"room",status:"open",subtotal:resv.ratePerNight*resv.totalNights,taxAmount:Math.round(resv.ratePerNight*resv.totalNights*0.18),totalAmount:Math.round(resv.ratePerNight*resv.totalNights*1.18),balance:Math.round(resv.ratePerNight*resv.totalNights*1.18)}});
    await db.folioLine.create({data:{folioId:folio.id,transactionType:"charge",description:`Room charges - ${resv.totalNights} nights`,amount:resv.ratePerNight*resv.totalNights,taxAmount:Math.round(resv.ratePerNight*resv.totalNights*0.18),departmentCode:"ROOM",postedAt:new Date()}});
  }
  console.log("Reservations + Folios done");

  const hkAtt = await db.user.findFirst({where:{propertyId,role:"hk_attendant"}});
  const hkMgr = await db.user.findFirst({where:{propertyId,role:"hk_mgr"}});
  for (let i=0;i<Math.min(10,allRooms.length);i++) {
    await db.housekeepingTask.create({data:{propertyId,roomId:allRooms[i].id,taskType:i<4?"checkout_cleaning":"stayover",priority:i===0?"urgent":i<3?"high":"normal",status:i<2?"completed":i<4?"in_progress":"pending",assignedToId:hkAtt?.id??null,inspectedById:i<2?hkMgr?.id??null:null,scheduledFor:new Date(),checklist:JSON.stringify([{item:"Bed linen changed",done:i<2},{item:"Bathroom sanitized",done:i<2},{item:"Towels replaced",done:i<2}])}});
  }
  console.log("Housekeeping done");

  for (const item of [
    {name:"King Bed Sheet",category:"bedroom_linen",subCategory:"bed_linen",sku:"BL-BS-001",unit:"pcs",unitCost:850,quantity:60,parLevel:40,maxStock:80,reorderQty:20,seasonBuffer:0.3,minPerRoom:3,roomTypeId:"cat-suite",isConsumable:false,lifecycleDays:180,location:"linen_room"},
    {name:"Bath Towel Large",category:"bathroom_linen",subCategory:"bath_towel",sku:"RL-BT-001",unit:"pcs",unitCost:550,quantity:80,parLevel:52,maxStock:100,reorderQty:20,seasonBuffer:0.35,minPerRoom:2,isConsumable:false,lifecycleDays:180,location:"linen_room"},
    {name:"Soap Bar",category:"bathroom_amenity",subCategory:"soap",sku:"BA-SO-001",unit:"pcs",unitCost:45,quantity:500,parLevel:200,maxStock:800,reorderQty:200,seasonBuffer:0.5,minPerRoom:2,isConsumable:true,lifecycleDays:7,location:"housekeeping_store"},
    {name:"Shampoo Bottle 30ml",category:"bathroom_amenity",subCategory:"shampoo",sku:"BA-SH-001",unit:"pcs",unitCost:65,quantity:400,parLevel:156,maxStock:600,reorderQty:150,seasonBuffer:0.5,minPerRoom:2,isConsumable:true,lifecycleDays:7,location:"housekeeping_store"},
    {name:"Mineral Water 500ml",category:"minibar",subCategory:"water",sku:"MB-MW-001",unit:"pcs",unitCost:20,quantity:200,parLevel:78,maxStock:400,reorderQty:100,seasonBuffer:0.6,minPerRoom:2,isConsumable:true,lifecycleDays:180,location:"minibar_store"},
    {name:"Coffee Sachets Box",category:"kitchen",subCategory:"condiment",sku:"KT-CF-001",unit:"box",unitCost:200,quantity:30,parLevel:20,maxStock:50,reorderQty:10,seasonBuffer:0.4,minPerRoom:1,isConsumable:true,lifecycleDays:180,location:"kitchen"},
    {name:"TV Remote Control",category:"electronics",subCategory:"remote",sku:"EL-TR-001",unit:"pcs",unitCost:450,quantity:28,parLevel:26,maxStock:30,reorderQty:4,seasonBuffer:0.1,minPerRoom:1,isConsumable:false,lifecycleDays:730,location:"warehouse"},
    {name:"Notepad",category:"stationery",subCategory:"paper",sku:"ST-NP-001",unit:"pcs",unitCost:30,quantity:200,parLevel:78,maxStock:300,reorderQty:80,seasonBuffer:0.3,minPerRoom:1,isConsumable:true,lifecycleDays:7,location:"housekeeping_store"},
    {name:"Fire Extinguisher",category:"safety",subCategory:"fire",sku:"SF-FE-001",unit:"pcs",unitCost:3500,quantity:30,parLevel:30,maxStock:35,reorderQty:3,seasonBuffer:0,minPerRoom:1,isConsumable:false,lifecycleDays:1825,location:"warehouse"},
    {name:"Cushion Cover",category:"living_room",subCategory:"cushion",sku:"LR-CC-001",unit:"pcs",unitCost:350,quantity:40,parLevel:26,maxStock:50,reorderQty:10,seasonBuffer:0.3,minPerRoom:2,roomTypeId:"cat-suite",isConsumable:false,lifecycleDays:270,location:"linen_room"},
  ]) {
    await db.amenityItem.create({data:{propertyId,...item,availableQty:item.quantity-Math.floor(item.quantity*0.3),issuedQty:Math.floor(item.quantity*0.3),condition:"good"}});
  }
  console.log("Amenities done");

  const year = now.getFullYear();
  await db.seasonConfig.createMany({data:[
    {propertyId,name:"Peak Summer",category:"bedroom_linen",multiplier:1.4,startDate:new Date(year,3,1),endDate:new Date(year,5,30),isActive:true,autoReorder:true},
    {propertyId,name:"Peak Summer",category:"bathroom_amenity",multiplier:1.5,startDate:new Date(year,3,1),endDate:new Date(year,5,30),isActive:true,autoReorder:true},
    {propertyId,name:"Monsoon",category:"bathroom_linen",multiplier:1.3,startDate:new Date(year,6,1),endDate:new Date(year,8,30),isActive:true,autoReorder:false},
  ]});
  console.log("Seasons done");

  const accounts = [
    {code:"1000",name:"Current Assets",accountType:"asset",subType:"current_asset",normalBalance:"debit",isSystem:true},
    {code:"1100",name:"Cash in Hand",accountType:"asset",subType:"current_asset",parentCode:"1000",normalBalance:"debit",isSystem:true},
    {code:"1200",name:"Bank Account",accountType:"asset",subType:"current_asset",parentCode:"1000",normalBalance:"debit",isSystem:true},
    {code:"3000",name:"Current Liabilities",accountType:"liability",subType:"current_liability",normalBalance:"credit",isSystem:true},
    {code:"3100",name:"Accounts Payable",accountType:"liability",subType:"current_liability",parentCode:"3000",normalBalance:"credit",isSystem:true},
    {code:"4000",name:"Owner's Equity",accountType:"equity",normalBalance:"credit",isSystem:true},
    {code:"5000",name:"Room Revenue",accountType:"revenue",subType:"operating_revenue",normalBalance:"credit",isSystem:true},
    {code:"5100",name:"F&B Revenue",accountType:"revenue",subType:"operating_revenue",normalBalance:"credit",isSystem:true},
    {code:"6000",name:"Cost of Goods Sold",accountType:"expense",subType:"cost_of_goods",normalBalance:"debit",isSystem:true},
    {code:"6100",name:"Salary & Wages",accountType:"expense",subType:"payroll",normalBalance:"debit",isSystem:true},
    {code:"6200",name:"Utilities",accountType:"expense",subType:"operating_expense",normalBalance:"debit"},
    {code:"6300",name:"Maintenance",accountType:"expense",subType:"operating_expense",normalBalance:"debit"},
  ];
  const accountMap: any = {};
  for (const acc of accounts) {
    const created = await db.account.create({data:{propertyId,code:acc.code,name:acc.name,accountType:acc.accountType,subType:acc.subType||null,parentAccountId:acc.parentCode?accountMap[acc.parentCode]:null,normalBalance:acc.normalBalance as any,isSystem:acc.isSystem||false,balance:0}});
    accountMap[acc.code] = created.id;
  }
  console.log("Accounts done");

  const createdVendors = await db.vendor.findMany({where:{propertyId}});
  await db.invoice.createMany({data:[
    {propertyId,invoiceNumber:"INV-2025-001",invoiceType:"tax_invoice",partyName:createdVendors[0]?.name??"Linen Solutions",amount:125000,cgst:11250,sgst:11250,totalAmount:147500,status:"paid",dueDate:new Date(today.getTime()-15*86400000),paidAmount:147500,notes:"Bed linen supplies"},
    {propertyId,invoiceNumber:"INV-2025-002",invoiceType:"tax_invoice",partyName:createdVendors[1]?.name??"CleanPro",amount:45000,cgst:4050,sgst:4050,totalAmount:53100,status:"paid",dueDate:new Date(today.getTime()-10*86400000),paidAmount:53100,notes:"Cleaning chemicals"},
    {propertyId,invoiceNumber:"INV-2025-003",invoiceType:"tax_invoice",partyName:createdVendors[4]?.name??"Coffee Bean",amount:67000,cgst:6030,sgst:6030,totalAmount:79060,status:"pending",dueDate:new Date(today.getTime()+15*86400000),paidAmount:0,notes:"Coffee supplies"},
    {propertyId,invoiceNumber:"INV-2025-004",invoiceType:"tax_invoice",partyName:createdVendors[2]?.name??"Premium Supplies",amount:89000,cgst:8010,sgst:8010,totalAmount:105020,status:"overdue",dueDate:new Date(today.getTime()-5*86400000),paidAmount:0,notes:"General supplies"},
  ]});
  const allUsers = await db.user.findMany({where:{propertyId}});
  await db.expense.createMany({data:[
    {propertyId,category:"utilities",amount:85000,description:"Electricity bill",expenseDate:new Date(today.getFullYear(),today.getMonth()-1,15),approvedById:allUsers.find(u=>u.role==="gm")?.id??null,status:"approved"},
    {propertyId,category:"maintenance",amount:35000,description:"AC repair",expenseDate:new Date(today.getFullYear(),today.getMonth()-1,20),approvedById:allUsers.find(u=>u.role==="gm")?.id??null,status:"approved"},
    {propertyId,category:"marketing",amount:50000,description:"Social media campaign",expenseDate:new Date(today.getFullYear(),today.getMonth(),1),status:"pending"},
    {propertyId,category:"supplies",amount:25000,description:"Office supplies",expenseDate:new Date(today.getFullYear(),today.getMonth(),5),status:"approved"},
  ]});
  console.log("Invoices + Expenses done");

  await db.notification.createMany({data:[
    {propertyId,type:"info",title:"New reservation",message:"AUR-1505 — Mr. John Smith, Deluxe Room"},
    {propertyId,type:"warning",title:"Low stock alert",message:"Coffee Capsules below PAR level"},
    {propertyId,type:"success",title:"Check-in complete",message:"Room 101 — Mr. Rajesh Kumar"},
  ]});
  console.log("Notifications done");

  for (const v of createdVendors.slice(0,3)) {
    await db.vendorRating.create({data:{propertyId,vendorId:v.id,qualityScore:7+Math.floor(Math.random()*3),deliveryScore:6+Math.floor(Math.random()*4),priceScore:7+Math.floor(Math.random()*3),communicationScore:6+Math.floor(Math.random()*3),overallScore:7+Math.random()*2,review:"Good supplier"}});
  }
  console.log("Vendor ratings done");

  const attBatch: any[] = [];
  const attDate = new Date(today.getFullYear(),today.getMonth(),1);
  while (attDate <= today) {
    if (attDate.getDay() !== 0) {
      for (const u of allUsers) {
        const isLate = Math.random() < 0.1;
        const isAbsent = Math.random() < 0.05;
        const checkIn = new Date(attDate); checkIn.setHours(9,isLate?30:0,0);
        const checkOut = new Date(attDate); checkOut.setHours(18,0,0);
        attBatch.push({propertyId,userId:u.id,date:new Date(attDate),checkIn:isAbsent?null:checkIn,checkOut:isAbsent?null:checkOut,status:isAbsent?"absent":isLate?"late":"present",overtimeHours:0,workHours:isAbsent?0:9,source:"system"});
      }
    }
    attDate.setDate(attDate.getDate()+1);
  }
  for (let i=0;i<attBatch.length;i+=100) await db.attendance.createMany({data:attBatch.slice(i,i+100)});
  console.log("Attendance done");

  console.log("✅ Seed complete!");
}

seed().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());

-- One-time, idempotent launch selection. Staff manage subsequent weeks in /admin/offers.
-- No promotional price or discount is implied; customers request their trade quotation.
WITH selections(slug,title,description,tone,position,brand_keys) AS (VALUES
 ('weekly-myprotein-myvitamins-2026-09-28','Myprotein & Myvitamins','Build your sports nutrition and daily wellness range. Request your trade quotation.','lime',1,ARRAY['myprotein','myvitamins']),
 ('weekly-aveeno-2026-09-28','Aveeno essentials','Explore everyday skincare for your customers. Request your trade quotation.','oat',2,ARRAY['aveeno']),
 ('weekly-natures-aid-2026-09-28','Nature’s Aid','Vitamins and supplements for your next replenishment. Request your trade quotation.','peach',3,ARRAY['naturesaid']),
 ('weekly-biogaia-2026-09-28','BioGaia','Discover the BioGaia range for your business. Request your trade quotation.','rose',4,ARRAY['biogaia']),
 ('weekly-hawkins-brimble-2026-09-28','Hawkins & Brimble','Grooming essentials for your retail range. Request your trade quotation.','stone',5,ARRAY['hawkinsbrimble'])
), inserted AS (
 INSERT INTO offers(title,slug,description,badge_text,badge_color,start_date,end_date,is_active,sort_order)
 SELECT title,slug,description,'WEEKLY SELECTION',tone,'2026-09-28 00:00:00','2026-10-04 23:59:59',true,position FROM selections
 ON CONFLICT(slug) DO NOTHING RETURNING id,slug
)
INSERT INTO offer_items(offer_id,product_id,sort_order,is_active)
SELECT i.id,p.id,p.position,true FROM inserted i JOIN selections s USING(slug)
CROSS JOIN LATERAL (
 SELECT id,row_number() OVER(ORDER BY catalogue_sort_rank,id)::integer position FROM (
  SELECT p.id,p.catalogue_sort_rank,row_number() OVER(PARTITION BY b.id ORDER BY p.catalogue_sort_rank,p.id) brand_position
  FROM products p JOIN brands b ON b.id=p.brand_id
  WHERE p.is_active AND regexp_replace(lower(b.name),'[^a-z0-9]','','g')=ANY(s.brand_keys)
 ) ranked WHERE brand_position<=3
 ORDER BY catalogue_sort_rank,id
) p;

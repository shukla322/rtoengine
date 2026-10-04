import { INTENT_ACTIONS, type IntentAction } from '../../utils/deliverySimulation';
import type { IntentProfile } from '../../data/simZones';
import { AnimatePresence, motion } from 'motion/react';
import type { SimZonePreset } from '../../data/simZones';
import type { PendingNudge } from '../../utils/simEngine';
import shoesImage from '../../../SHOES.avif';
import kurtiImage from '../../../KURTI.avif';
import sareeImage from '../../../SAREE.avif';
import skincareImage from '../../../NEW PRODUCTS/photo-1580870069867-74c57ee1bb07.avif';
import kitchenImage from '../../../NEW PRODUCTS/photo-1589983006655-4ef9a756ebe3.avif';
import decorImage from '../../../NEW PRODUCTS/premium_photo-1679809447457-19bb601c4dce.avif';
import jewelleryImage from '../../../NEW PRODUCTS/premium_photo-1681276170281-cf50a487a1b7.avif';
import styles from './PhoneMockup.module.css';

export type PhoneScreen = 'catalog' | 'product' | 'cart' | 'address' | 'tracking';
export type ProductId = 'shoes' | 'kurti' | 'saree' | 'skincare' | 'kitchen' | 'decor' | 'jewellery';

export interface ProductItem {
  id: ProductId;
  name: string;
  category: string;
  price: number;
  image: string;
  rating: string;
  specs: string[];
}

export const products: ProductItem[] = [
  {
    id: 'shoes',
    name: "Men's Running Shoes",
    category: 'Footwear',
    price: 399,
    image: shoesImage,
    rating: '4.2 (12.8K)',
    specs: ['Lightweight mesh', 'Daily training fit', 'Cash on delivery'],
  },
  {
    id: 'kurti',
    name: 'Printed Kurti',
    category: 'Women Ethnic',
    price: 299,
    image: kurtiImage,
    rating: '4.4 (9.6K)',
    specs: ['Soft rayon fabric', 'Straight fit', 'Easy return eligible'],
  },
  {
    id: 'saree',
    name: 'Daily Wear Saree',
    category: 'Women Ethnic',
    price: 399,
    image: sareeImage,
    rating: '4.3 (18.1K)',
    specs: ['Light drape', 'Printed border', 'Blouse piece included'],
  },
  {
    id: 'skincare',
    name: 'Skincare Essentials Kit',
    category: 'Beauty & Personal Care',
    price: 649,
    image: skincareImage,
    rating: '4.5 (7.4K)',
    specs: ['Daily routine set', 'Travel friendly', 'COD available'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen Tools Set',
    category: 'Home & Kitchen',
    price: 549,
    image: kitchenImage,
    rating: '4.1 (6.2K)',
    specs: ['Non-stick safe', 'Wood handle finish', 'Easy clean'],
  },
  {
    id: 'decor',
    name: 'Handcrafted Decor Set',
    category: 'Home Decor',
    price: 699,
    image: decorImage,
    rating: '4.4 (5.8K)',
    specs: ['Tabletop accent', 'Printed finish', 'Gift ready'],
  },
  {
    id: 'jewellery',
    name: 'Pendant Jewellery Set',
    category: 'Jewellery',
    price: 349,
    image: jewelleryImage,
    rating: '4.2 (8.9K)',
    specs: ['Gold-tone finish', 'Adjustable chain', 'Lightweight'],
  },
];

export function PhoneMockup({
  screen,
  selectedProduct,
  onSelectProduct,
  onAddToCart,
  onGoToAddress,
  zones,
  selectedZoneKey,
  onSelectZone,
  onPlaceOrder,
  pendingNudge,
  onNudgeAction,
  outcome,
  statusLines,
  journeyStatus,
  intent,
  onIntentAction,
}: {
  screen: PhoneScreen;
  selectedProduct: ProductItem;
  onSelectProduct: (product: ProductItem) => void;
  onAddToCart: () => void;
  onGoToAddress: () => void;
  zones: SimZonePreset[];
  selectedZoneKey: string | null;
  onSelectZone: (key: string) => void;
  onPlaceOrder: () => void;
  pendingNudge: PendingNudge | null;
  onNudgeAction: (action: 'respond' | 'ignore') => void;
  outcome: 'delivered' | 'undelivered' | 'held' | null;
  statusLines: string[];
  journeyStatus: string;
  intent?: IntentProfile;
  onIntentAction: (action: IntentAction) => void;
}) {
  const ignoreImpact = pendingNudge?.channel === 'support'
    ? 'Hold order'
    : pendingNudge?.channel === 'call'
    ? '-15 PDS'
    : pendingNudge?.channel === 'whatsapp' && pendingNudge.zone === 'yellow' && pendingNudge.ladderStep === 2
      ? 'Red zone hold'
      : '-10 PDS';

  return (
    <motion.div
      className={styles.frame}
      initial={{ opacity: 0, scale: 0.94, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
    >
      <span className={styles.buttonAction} aria-hidden="true" />
      <span className={styles.buttonVolUp} aria-hidden="true" />
      <span className={styles.buttonVolDown} aria-hidden="true" />
      <span className={styles.buttonPower} aria-hidden="true" />
      <span className={styles.buttonCamera} aria-hidden="true" />

      <div className={styles.screen}>
        <span className={styles.dynamicIsland} aria-hidden="true" />

        <div className={styles.statusBar}>
          <span>9:41</span>
          <span className={styles.statusIcons}>LTE 100%</span>
        </div>

        <div className={styles.appBar}>
          <span className={styles.brand}>meesho</span>
          <span className={styles.appAction} aria-hidden="true">Cart</span>
        </div>

        <div className={styles.body}>
          {screen === 'catalog' && (
            <div className={styles.screenContent}>
              <div className={styles.catalogHead}>
                <h3 className={styles.sectionTitle}>Select Product</h3>
                <span>{products.length} items</span>
              </div>
              <div className={styles.productGrid}>
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className={styles.productTile}
                    data-selected={selectedProduct.id === product.id}
                    onClick={() => onSelectProduct(product)}
                  >
                    <span className={styles.tileImage} aria-hidden="true">
                      <img src={product.image} alt="" />
                    </span>
                    <span className={styles.tileInfo}>
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>
                      <b>Rs {product.price}</b>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen === 'product' && (
            <div className={styles.screenContent}>
              <div className={styles.productImg} aria-hidden="true">
                <img src={selectedProduct.image} alt="" />
              </div>
              <p className={styles.productName}>{selectedProduct.name}</p>
              <p className={styles.productPrice}>
                Rs {selectedProduct.price} <span className={styles.rating}>Rating {selectedProduct.rating}</span>
              </p>
              <div className={styles.specList}>
                {selectedProduct.specs.map((spec) => (
                  <span key={spec}>{spec}</span>
                ))}
              </div>
              <button type="button" className={styles.primaryBtn} onClick={onAddToCart}>
                Add to Cart
              </button>
            </div>
          )}

          {screen === 'cart' && (
            <div className={styles.screenContent}>
              <h3 className={styles.sectionTitle}>Your Cart</h3>
              <div className={styles.cartRow}>
                <span className={styles.productImgSmall} aria-hidden="true">
                  <img src={selectedProduct.image} alt="" />
                </span>
                <span>
                  {selectedProduct.name}
                  <br />
                  <strong>Rs {selectedProduct.price}</strong> · Qty 1
                </span>
              </div>
              <button type="button" className={styles.primaryBtn} onClick={onGoToAddress}>
                Proceed to Delivery
              </button>
            </div>
          )}

          {screen === 'address' && (
            <div className={styles.screenContent}>
              <h3 className={styles.sectionTitle}>Delivery Address</h3>
              {zones.map((z) => (
                <button
                  key={z.key}
                  type="button"
                  className={styles.addressCard}
                  data-zone={z.key}
                  data-selected={selectedZoneKey === z.key}
                  onClick={() => onSelectZone(z.key)}
                >
                  <span className={styles.addressPin} data-zone={z.key} aria-hidden="true">
                    ●
                  </span>
                  <span>
                    <strong>{z.label}</strong>
                    <br />
                    <span className={styles.addressText}>{z.address}</span>
                  </span>
                  <span className={styles.radio} data-selected={selectedZoneKey === z.key} aria-hidden="true" />
                </button>
              ))}
              <button type="button" className={styles.primaryBtn} disabled={!selectedZoneKey} onClick={onPlaceOrder}>
                Place Order
              </button>
            </div>
          )}

          {screen === 'tracking' && (
            <div className={styles.screenContent}>
              <h3 className={styles.sectionTitle}>
                {outcome === 'delivered' ? 'Delivered' : outcome === 'held' ? 'Order Held' : 'Your delivery'}
              </h3>
              {outcome === 'delivered' && <div className={styles.outcomeGood}>Delivered to your door</div>}
              {outcome === 'held' && <div className={styles.outcomeBad}>Journey paused ? confirmation required</div>}
              <p className={styles.journeyStatus}>{journeyStatus}</p>
              {outcome === 'undelivered' && <div className={styles.outcomeBad}>Original order not delivered. Parcel recovery is tracked separately.</div>}
              {intent && outcome !== 'delivered' && outcome !== 'undelivered' && (
                <div className={styles.intentPanel}>
                  <h4>Manage your delivery</h4>
                  <p>Track your parcel or update your delivery preferences.</p>
                  {outcome === 'held' && <button type="button" className={styles.primaryBtn} onClick={() => onIntentAction('confirm')}>Confirm I will receive this order</button>}
                  {INTENT_ACTIONS.map(action => (
                    <button className={styles.intentAction} data-caution={action.key === 'exitIntent' || action.key === 'sameCategory'} type="button" key={action.key} disabled={!!pendingNudge} onClick={() => onIntentAction(action.key)}><span>{action.label}</span><span aria-hidden="true">&rsaquo;</span></button>
                  ))}

                </div>
              )}
              <ul className={styles.statusList}>
                {statusLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <AnimatePresence>
            {pendingNudge && (
              <motion.div
                className={styles.nudgeOverlay}
                role="alertdialog"
                aria-label={pendingNudge.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <motion.div
                  className={styles.nudgeCard}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                >
                  <span className={styles.nudgeIcon} aria-hidden="true">
                    {pendingNudge.channel === 'support' ? 'SOS' : pendingNudge.channel === 'call' ? 'CALL' : pendingNudge.channel === 'whatsapp' ? 'WA' : 'PUSH'}
                  </span>
                  <p className={styles.nudgeTitle}>{pendingNudge.title}</p>
                  <p className={styles.nudgeMessage}>{pendingNudge.message}</p>
                  <div className={styles.nudgeActions}>
                    <button type="button" className={styles.respondBtn} onClick={() => onNudgeAction('respond')}>
                      Confirm delivery <span>PDS &rarr; 72+</span>
                    </button>
                    <button type="button" className={styles.ignoreBtn} onClick={() => onNudgeAction('ignore')}>
                      Ignore <span>{ignoreImpact}</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.tabBar}>
          <span>Home</span>
          <span>Shop</span>
          <span>Orders</span>
          <span>Account</span>
        </div>

        <span className={styles.homeIndicator} aria-hidden="true" />
      </div>
    </motion.div>
  );
}

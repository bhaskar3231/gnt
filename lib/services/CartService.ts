/**
 * Cart Service
 * Business logic for shopping cart operations
 */

import { Cart, ProductVariant, Inventory } from '@/models';
import { ICart, ICartItem } from '@/models/Cart';

export class CartService {
  /**
   * Get cart by user ID
   */
  static async getCartByUserId(userId: string): Promise<ICart | null> {
    return await Cart.findOne({ userId });
  }

  /**
   * Get cart by session ID
   */
  static async getCartBySessionId(sessionId: string | null): Promise<ICart | null> {
    if (!sessionId || typeof sessionId !== 'string') return null;
    return await Cart.findOne({ sessionId });
  }

  /**
   * Add item to cart
   */
  static async addToCart(
    userId: string | undefined,
    sessionId: string | null | undefined,
    item: ICartItem
  ): Promise<ICart> {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    let cart = userId
      ? await this.getCartByUserId(userId)
      : await this.getCartBySessionId(sessionId!);

    if (!cart) {
      const cartData: any = {
        items: [item],
        subtotal: 0,
        total: 0,
      };

      if (userId) cartData.userId = userId;
      if (sessionId) cartData.sessionId = sessionId;

      cart = new Cart(cartData);
    } else {
      // Check if item already exists
      const existingItem = cart.items.find(
        (i: any) => i.productVariantId.toString() === item.productVariantId.toString()
      );

      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        cart.items.push(item);
      }
    }

    // Recalculate totals
    if (cart) {
      this.recalculateCart(cart);
      return await cart.save();
    }

    throw new Error('Failed to initialize cart');
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(
    userId: string | undefined,
    sessionId: string | null,
    productVariantId: string
  ): Promise<ICart | null> {
    const query = userId ? { userId } : { sessionId };
    const cart = await Cart.findOne(query);

    if (!cart) return null;

    cart.items = cart.items.filter(
      (item: any) => item.productVariantId.toString() !== productVariantId
    );

    this.recalculateCart(cart);
    return await cart.save();
  }

  /**
   * Update item quantity
   */
  static async updateItemQuantity(
    userId: string | undefined,
    sessionId: string | null,
    productVariantId: string,
    quantity: number
  ): Promise<ICart | null> {
    if (quantity < 1) {
      return this.removeFromCart(userId, sessionId, productVariantId);
    }

    const query = userId ? { userId } : { sessionId };
    const cart = await Cart.findOne(query);

    if (!cart) return null;

    const item = cart.items.find(
      (i: any) => i.productVariantId.toString() === productVariantId
    );

    if (item) {
      item.quantity = quantity;
    }

    this.recalculateCart(cart);
    return await cart.save();
  }

  /**
   * Clear cart
   */
  static async clearCart(
    userId: string | undefined,
    sessionId: string | null
  ): Promise<ICart | null> {
    const query = userId ? { userId } : { sessionId };
    return await Cart.findOneAndUpdate(
      query,
      { items: [], subtotal: 0, discount: 0, total: 0 },
      { new: true }
    );
  }

  /**
   * Recalculate cart totals
   */
  private static recalculateCart(cart: ICart): void {
    let subtotal = 0;

    for (const item of cart.items) {
      subtotal += item.price * item.quantity;
    }

    cart.subtotal = subtotal;
    // Tax and shipping would be calculated based on configuration
    cart.total = subtotal + (cart.shipping || 0) + (cart.tax || 0) - (cart.discount || 0);
  }

  /**
   * Apply coupon to cart
   */
  static async applyCoupon(
    userId: string | undefined,
    sessionId: string | undefined,
    couponCode: string
  ): Promise<ICart | null> {
    const query = userId ? { userId } : { sessionId };
    const cart = await Cart.findOne(query);

    if (!cart) return null;

    // TODO: Validate coupon and calculate discount
    cart.couponCode = couponCode;
    return await cart.save();
  }

  /**
   * Validate cart inventory before checkout
   */
  static async validateCartInventory(cart: ICart): Promise<boolean> {
    for (const item of cart.items) {
      // First try the dedicated Inventory collection
      const inventory = await Inventory.findOne({
        productVariantId: item.productVariantId,
      });

      if (inventory) {
        if (inventory.availableQuantity < item.quantity) return false;
      } else {
        // Fall back to ProductVariant.inventory field
        const variant = await ProductVariant.findById(item.productVariantId);
        if (!variant || variant.inventory < item.quantity) return false;
      }
    }

    return true;
  }
}
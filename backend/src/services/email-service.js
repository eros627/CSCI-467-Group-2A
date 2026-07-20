// This script is responsible for sending order confirmation and shipment confirmation emails to customers. 
// It uses the nodemailer library to send emails via SMTP or logs the email content in console mode

// Import nodemailer: it allows sending emails via SMTP. Import logger: it is used for logging email delivery status and errors
import nodemailer from 'nodemailer';

// Import logger: it is used for logging email delivery status and errors
import { logger } from '../lib/logger.js';

// Function to generate the order confirmation email content
function orderConfirmation(order) {
    const lines = order.items.map(
        (item) => `${item.quantity} × ${item.description} (#${item.partNumber}) — $${item.lineTotal.toFixed(2)}`,
    );
    
    return {
        subject: `Order #${order.orderNumber} confirmed`,
        text: [
            `Hello ${order.customer.name},`,
            '',
            'Your payment was authorized and your order is ready for packing.',
            '',
            ...lines,
            '',
            `Subtotal: $${order.subtotal.toFixed(2)}`,
            `Shipping and handling: $${order.shippingCharge.toFixed(2)}`,
            `Total: $${order.totalAmount.toFixed(2)}`,
        ].join('\n'),
    };
}

// Function to generate the shipment confirmation email content
function shipmentConfirmation(order) {
    return {
        subject: `Order #${order.orderNumber} shipped`,
        text: [
            `Hello ${order.customer.name},`,
            '',
            `Your order has shipped via ${order.shipping.carrier}.`,
            `Tracking number: ${order.shipping.trackingNumber}`,
        ].join('\n'),
    };
}

// Function to create the email service with the provided configuration
export function createEmailService(config) {
    const transporter = config.mode === 'smtp' ? nodemailer.createTransport(config.smtp) : null;
    
     // Function to send an email to the customer
    async function send(order, content, type) {
        if (transporter) {
            await transporter.sendMail({
                from: config.from,
                to: order.customer.email,
                subject: content.subject,
                text: content.text,
            });
            return;
        }
           
        logger.info('Email suppressed in console mode', {
            type,
            orderId: order.id,
            recipient: order.customer.email,
            subject: content.subject,
        });
    }
       
    // Function to safely execute the email sending work and log any errors
    async function safely(work, order, type) {
        try {
            await work();
        } 
        catch (error) {
            logger.error('Email delivery failed', { type, orderId: order.id, error: error.message });
        }
    }
       
    // Return an object with methods to send order confirmation and shipment confirmation emails
    return {
        sendOrderConfirmation(order) {
            return safely(() => send(order, orderConfirmation(order), 'order-confirmation'), order, 'order-confirmation');
        },
        
        sendShipmentConfirmation(order) {
            return safely(() => send(order, shipmentConfirmation(order), 'shipment-confirmation'), order, 'shipment-confirmation');
        },
    };
}

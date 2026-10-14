import React from 'react';
import { Sale, Settings } from '../core/store';
import { ReceiptTicket } from './ReceiptTicket';

interface RoyalReceiptProps {
    sale: Sale;
    settings?: Settings;
    cashierName?: string;
    title?: string;
    isSettlement?: boolean;
}

export const RoyalReceipt: React.FC<RoyalReceiptProps> = ({
    sale,
    settings,
    title,
    isSettlement
}) => {
    return (
        <ReceiptTicket 
            sale={sale} 
            settings={settings} 
            title={title} 
            isSettlement={isSettlement} 
        />
    );
};

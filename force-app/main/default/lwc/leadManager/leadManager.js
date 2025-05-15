import { LightningElement, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getLeads from '@salesforce/apex/LeadManagerController.getLeads';
import getStatusOptions from '@salesforce/apex/LeadManagerController.getStatusOptions';
import getUserOptions from '@salesforce/apex/LeadManagerController.getUserOptions';
import updateLeadStatus from '@salesforce/apex/LeadManagerController.updateLeadStatus';
import updateLeadOwner from '@salesforce/apex/LeadManagerController.updateLeadOwner';

const columns = [
    { 
        label: 'Name', 
        fieldName: 'Name', 
        type: 'text',
        sortable: true,
        cellAttributes: { 
            iconName: 'standard:lead', 
            iconPosition: 'left' 
        }
    },
    { 
        label: 'Company', 
        fieldName: 'Company', 
        type: 'text',
        sortable: true 
    },
    { 
        label: 'Status', 
        fieldName: 'Status', 
        type: 'text',
        sortable: true,
        cellAttributes: { 
            class: { fieldName: 'statusClass' }
        }
    },
    { 
        label: 'Owner', 
        fieldName: 'OwnerName', 
        type: 'text',
        sortable: true 
    },
    { 
        label: 'Lead Source', 
        fieldName: 'LeadSource', 
        type: 'text',
        sortable: true 
    }
];

export default class LeadManager extends LightningElement {
    columns = columns;
    data = [];
    filteredData = [];
    selectedRows = [];
    statusOptions = [];
    userOptions = [];
    selectedStatus;
    selectedOwner;
    searchTerm = '';
    
    wiredLeadsResult;
    error;
    isLoading = true;
    
    get isUpdateDisabled() {
        return this.isLoading || !this.selectedRows.length;
    }
    
    get selectedRowsCount() {
        return this.selectedRows ? this.selectedRows.length : 0;
    }
    
    get totalLeadsLabel() {
        const count = this.filteredData.length;
        return `${count} ${count === 1 ? 'Lead' : 'Leads'}`;
    }
    
    @wire(getLeads)
    wiredLeads(result) {
        this.wiredLeadsResult = result;
        this.isLoading = true;
        if (result.data) {
            this.processLeadData(result.data);
            this.error = undefined;
            this.isLoading = false;
        } else if (result.error) {
            this.error = result.error;
            this.data = [];
            this.filteredData = [];
            this.showToast('Error', 'Error loading leads: ' + result.error.body.message, 'error');
            this.isLoading = false;
        }
    }
    
    processLeadData(leads) {
        this.data = leads.map(lead => {
            // Add status styling based on values
            let statusClass = '';
            if (lead.Status === 'Working - Contacted') {
                statusClass = 'slds-text-color_success';
            } else if (lead.Status === 'Closed - Not Converted') {
                statusClass = 'slds-text-color_error';
            } else if (lead.Status === 'Open - Not Contacted') {
                statusClass = 'slds-text-color_weak';
            }
            
            return {
                ...lead,
                OwnerName: lead.Owner.Name,
                statusClass: statusClass
            };
        });
        this.filteredData = [...this.data];
        this.applyFilter();
    }
    
    @wire(getStatusOptions)
    wiredStatusOptions({ error, data }) {
        if (data) {
            this.statusOptions = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.statusOptions = [];
            this.showToast('Error', 'Error loading status options: ' + error.body.message, 'error');
        }
    }
    
    @wire(getUserOptions)
    wiredUserOptions({ error, data }) {
        if (data) {
            this.userOptions = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.userOptions = [];
            this.showToast('Error', 'Error loading user options: ' + error.body.message, 'error');
        }
    }
    
    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
    }
    
    handleStatusChange(event) {
        this.selectedStatus = event.detail.value;
    }
    
    handleOwnerChange(event) {
        this.selectedOwner = event.detail.value;
    }
    
    handleSearch(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.applyFilter();
    }
    
    applyFilter() {
        if (!this.searchTerm) {
            this.filteredData = [...this.data];
            return;
        }
        
        this.filteredData = this.data.filter(lead => {
            const searchableFields = [
                lead.Name, 
                lead.Company, 
                lead.Status, 
                lead.OwnerName,
                lead.LeadSource
            ];
            
            return searchableFields.some(field => 
                field && field.toLowerCase().includes(this.searchTerm)
            );
        });
    }
    
    handleRefresh() {
        this.isLoading = true;
        this.selectedRows = [];
        refreshApex(this.wiredLeadsResult)
            .finally(() => {
                this.showToast('Success', 'Lead data refreshed', 'success');
                this.isLoading = false;
            });
    }
    
    updateStatus() {
        if (!this.selectedRows.length) {
            this.showToast('Warning', 'Please select at least one lead', 'warning');
            return;
        }
        
        if (!this.selectedStatus) {
            this.showToast('Warning', 'Please select a status', 'warning');
            return;
        }
        
        const leadIds = this.selectedRows.map(row => row.Id);
        this.isLoading = true;
        
        updateLeadStatus({ leadIds: leadIds, status: this.selectedStatus })
            .then(() => {
                this.showToast('Success', `${leadIds.length} leads updated successfully`, 'success');
                return refreshApex(this.wiredLeadsResult);
            })
            .catch(error => {
                this.showToast('Error', 'Error updating leads: ' + error.body.message, 'error');
            })
            .finally(() => {
                this.isLoading = false;
                this.selectedRows = [];
            });
    }
    
    updateOwner() {
        if (!this.selectedRows.length) {
            this.showToast('Warning', 'Please select at least one lead', 'warning');
            return;
        }
        
        if (!this.selectedOwner) {
            this.showToast('Warning', 'Please select an owner', 'warning');
            return;
        }
        
        const leadIds = this.selectedRows.map(row => row.Id);
        this.isLoading = true;
        
        updateLeadOwner({ leadIds: leadIds, newOwnerId: this.selectedOwner })
            .then(() => {
                this.showToast('Success', `${leadIds.length} lead owners updated successfully`, 'success');
                return refreshApex(this.wiredLeadsResult);
            })
            .catch(error => {
                this.showToast('Error', 'Error updating lead owners: ' + error.body.message, 'error');
            })
            .finally(() => {
                this.isLoading = false;
                this.selectedRows = [];
            });
    }
    
    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(evt);
    }
}
public with sharing class LeadManagerController {
    
    @AuraEnabled(cacheable=true)
    public static List<Lead> getLeads() {
        return [SELECT Id, Name, Company, Email, Phone, Status, Owner.Name FROM Lead LIMIT 1000];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getStatusOptions() {
        List<Map<String, String>> options = new List<Map<String, String>>();
        Schema.DescribeFieldResult fieldResult = Lead.Status.getDescribe();
        List<Schema.PicklistEntry> ple = fieldResult.getPicklistValues();
        
        for(Schema.PicklistEntry entry : ple) {
            Map<String, String> option = new Map<String, String>();
            option.put('label', entry.getLabel());
            option.put('value', entry.getValue());
            options.add(option);
        }
        
        return options;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getUserOptions() {
        List<Map<String, String>> options = new List<Map<String, String>>();
        for(User u : [SELECT Id, Name FROM User WHERE IsActive = true ORDER BY Name]) {
            Map<String, String> option = new Map<String, String>();
            option.put('label', u.Name);
            option.put('value', u.Id);
            options.add(option);
        }
        
        return options;
    }
    
    @AuraEnabled
    public static void updateLeadStatus(List<Id> leadIds, String status) {
        try {
            List<Lead> leadsToUpdate = new List<Lead>();
            for(Id leadId : leadIds) {
                leadsToUpdate.add(new Lead(Id = leadId, Status = status));
            }
            update leadsToUpdate;
        } catch(Exception e) {
            throw new AuraHandledException('Error updating leads: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateLeadOwner(List<Id> leadIds, Id newOwnerId) {
        try {
            List<Lead> leadsToUpdate = new List<Lead>();
            for(Id leadId : leadIds) {
                leadsToUpdate.add(new Lead(Id = leadId, OwnerId = newOwnerId));
            }
            update leadsToUpdate;
        } catch(Exception e) {
            throw new AuraHandledException('Error updating lead owners: ' + e.getMessage());
        }
    }
}
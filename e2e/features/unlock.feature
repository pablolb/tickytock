Feature: Unlock App
  As a user
  I want to unlock the app with my passphrase
  So I can access my time tracking data

  Scenario: Unlock by pasting passphrase (auto-submit)
    Given a user account "John" exists with passphrase "test123"
    And I am on the unlock page
    When I click on account "John"
    And I paste the passphrase "test123"
    Then the app auto-logins and I should see the main app

  Scenario: Unlock by typing passphrase (manual submit)
    Given a user account "Jane" exists with passphrase "test456"
    And I am on the unlock page
    When I click on account "Jane"
    Then the passphrase field should be focused
    And I type the passphrase "test456"
    And I click the submit button
    Then I should see the main app

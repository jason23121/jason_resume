$(document).ready(function() {
    /*
     * value sets for the toggle switch
     */
    var linkText = {'old':'Use A Saved Number', 'new':'Use A New Number'};
    var show = true;
    var hide = false;
    var moneyDiff = 0;

    /**
     * Clicking the close on the errro modal shoudl shut it down
     */
    $("#btnCloseCouponError").on('click', function(){
        hideCouponErrorModal();
    });

    /*
     * when the funds change after adding...recheck for continuation
     */
    $("#funds").on('change', function(){
        haveEnoughFunds();
    });

    /*
     * handling the apply code button
     */
    $("#btnApplyCoupon").on('click', function(){
        applyPromoCode();
    });

    /*
     * Used for determining the difference between cost and funds
     * @returns {Boolean}
     */
    function haveEnoughFunds()
    {
        return true;
    }

    /**
     * Show and and hide sections
     */
    function showHideSections(sectionId = 0) {
        // Load section by id
        if (!sectionId) {
            return false;
        }

        // Validate step is inactive
        if ($('#' + sectionId).attr('data-state') !== 'inactive') {
            return false;
        }

        // Hide all sections
        $('.step-body').slideUp(300);

        // Make all active sections inactive
        $('.phone-step[data-state="active"]').attr('data-state', 'inactive');

        // Reveal selected section
        $('#' + sectionId + ' .step-body').slideDown();
        $('#' + sectionId).attr('data-state', 'active');
    }

    $("#oldPhoneNumbers").on('change', function(){
        $("#stored_number_id").val( $(this).val() );
    });

    $("#lnkSwitchPhoneNumberForms").on('click', function(){

        if ( $(this).text() == linkText.old) {
            showHideOldPhoneNumberForm(show);
            showHideNewPhoneNumberForm(hide);
            setLinkToShowUseNew();
        } else {
            showHideOldPhoneNumberForm(hide);
            showHideNewPhoneNumberForm(show);
            setLinkToShowUseOld();
        }
    });

    function setLinkToShowUseOld()
    {
        $("#lnkSwitchPhoneNumberForms").text(linkText.old);
        $("#use_stored_number").val(0);
    }

    function setLinkToShowUseNew()
    {
        $("#lnkSwitchPhoneNumberForms").text(linkText.new);
        $("#use_stored_number").val(1);
    }

    function showHideOldPhoneNumberForm(showIt = true)
    {
        if( showIt) {
            $(".oldPhoneNumberForm").show();
            return true;
        }

        $(".oldPhoneNumberForm").hide();
        return true;
    }

    function showHideNewPhoneNumberForm(showIt = true)
    {
        if( showIt) {
            $(".newPhoneNumberForm").show();
            return true;
        }

        $(".newPhoneNumberForm").hide();
        return true;
    }

    var cleave = new Cleave('#phoneNumber', {
        phone: true,
        phoneRegionCode: 'US'
    });

    // Handle dropdown Country Code select
    $('#phoneCountry').change(function() {
        var countryCode = $(this).val();
        cleave.setPhoneRegionCode(countryCode);
    });

    /**
     * Expand sections on click
     */
    $('.step-heading').click(function() {
        // Get id of section from parent
        var sectionId = $(this).parent().attr('id');
        showHideSections(sectionId);
    });

    /**
     * Step 1. Choose a minute block
     */
     $('input[name="minute_block"]').bind('click change', function() {
        // If minute block input is selected show continue button
        if ($('input[name="minute_block"]:checked').val()) {
            $('#stepOneBtn').prop('disabled', false);
        } else {
            $('#stepOneBtn').prop('disabled', true);
        }

        // Calulate cost
        getListingRate();
     });

     $('input[name="minute_block"]').change();

    /**
     * Click for step 1
     */
    $('#stepOneBtn').click(function() {
        $('#stepTwo').attr('data-state', 'inactive');
        showHideSections('stepTwo');
        resetPromoCodeValueDisplay();
    })

    /**
     * Step 2 Logic
     */

    // Calculate the rate of selected minute block
    function getListingRate() {
        var rate = $('#rate').val();
        var minuteBlock = $('input[name="minute_block"]:checked').attr('data-minutes');

        // Calculate cost
        var cost = parseInt(rate * minuteBlock).toFixed(2);

        // Update cost display
        $('#cost').text(cost);

        return cost;
    }

    //IWD-755
    function popMemberDirectModal() {
         /*
         * Set message
         */
        $.ajax({
            url:base_url+"member/add_credits/set_add_funds_modal_flash_message",
            data: {"msg": "Please add $" + Math.abs(moneyDiff) + " to your account before you continue." },
            dataType : 'json',
            type:'POST',
            success: function(data){
                if(data.success) {
                    var amount = parseInt($("#cost").text(),10);
                    launchModal($('#member_direct_modal_url').val()+'/'+amount, '#paymentModal');
                } else {
                    location.reload();
                }
            },
            error: function (data) {
                location.reload();
            }
        });
    }

    /**
     * Click for step 2
     */
    $('#stepTwoBtn').click(function() {
        /*
         * if we dont have enought funds...push the user to add more
         */
        if( !haveEnoughFunds() ) {
            // disable button
            $("#stepTwoBtn").attr('disabled', 'disabled');
            popMemberDirectModal();
            return false;
        }

        // enable final button
        $('#stepThree').attr('data-state', 'inactive');
        showHideSections('stepThree');
        return false;
    });

    /**
     * Start call logic
     */
    $("#stepThreeBtn").on('click', function(){
        processOrder();
    });

    function processOrder() {
        //Grab data for validation/passing through
        var listingId = $('#listingId').val();
        var minuteBlock = $('input[name="minute_block"]:checked').val();
        var cost = getListingRate();
        var promo_code = 0;
        var original_cost = cost;

        if ( $("#promoCostDisplay").parent().hasClass('hidden') == false) {
            cost = parseInt( $("#promoCostDisplay").text(), 10);
            promo_code = $("#inpCouponCode").val();
        }
        var countryCode = $('#phoneCountry').val();
        var phone = $('#phoneNumber').val();
        var usedStoredNumber = $('#use_stored_number').val();
        if(!usedStoredNumber && !isValidNumber(phone, countryCode)){
            $('#phoneNumberAlertError').show();
            return false;
        } else {
            var processDelay = 1000;
            phone = formatE164(countryCode, phone);
            $('#phoneNumberAlertError').hide();
            // Show popup
            showCallPopup();
            // Wait for processing to show for a bit
            setTimeout(function() {
                $.ajax({
                    url: base_url + 'member/phone/process_order/',
                    data: {listing_id: listingId,
                        minute_block_id: minuteBlock,
                        price: cost,
                        phone: phone,
                        promoCode: promo_code,
                        originalCost: original_cost,
                        savePhoneNumber: $("#savePhoneNumber").prop('checked'),
                        useStoredNumber: $("#use_stored_number").val(),
                        storedNumberId:  $("#oldPhoneNumbers").val()},
                    type: 'POST',
                    dataType: 'JSON',
                    success: function(data) {
                        if (data.status == 'success') {
                            showSuccess(data.response);
                        } else {
                            updateModalError(data.response);
                        }
                    },
                    error: function(data) {
                        updateModalError('Unable to process your order at this time. Please try again later');
                    }
                });
            }, processDelay);
        }
    }

    function showCallPopup() {
        $('#orderModal').modal('show');
    }

    function showSuccess(redirect) {
        hideAllModal();
        $('#orderModal #mSuccess').removeClass('off');
        setTimeout(function() {
                window.location.href = redirect;
        }, 2000);
    }

    function updateModalError(msg) {
        hideAllModal();
        $('#orderModal #mError').removeClass('off');
        $('#orderModal #mError .m-text').text(msg);
    }

    function updateCouponModalError(msg) {
        hideAllModal();
        $('#orderModal #mCouponError').removeClass('off');
        $('#orderModal #mCouponError .m-text').text(msg);
    }

    function hideAllModal() {
        $('.modal-state').addClass('off');
    }

    function hideCouponErrorModal() {
        $('.modal-state').addClass('off');
        $("#orderModal").modal('hide');
    }

    function resetPromoCodeValueDisplay()
    {
        if ( $("#cost").parent().hasClass('strikethru')) {
            $("#cost").parent().toggleClass('strikethru');
        }

        $("#promoCostDisplay").text('').parent().addClass('hidden');
    }

});

import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import Modal from 'react-bootstrap/Modal'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'



export class MonitoringAppLogList extends Component {

	constructor(props) {
		super(props);
		this.state = {  }
	}

	render() {
        let appLogItems = [];
        this.props.monitoringApps.map((app, index) => {
            const uniqueKey = `${app.Id}` ;
            appLogItems.push(<ListGroup.Item as="li" key={uniqueKey} active={app.active}>{app.Name}</ListGroup.Item>);
        }); 

        return (
            <div>
                <ListGroup as="ul">
                    {appLogItems}
                </ListGroup>
            </div>
        );
	}
}

const mapStateToProps = state => {
	return {
       monitoringApps: state.application.monitoringApps
	};
};

const mapDispatchToProps = dispatch => {
	return {

	};
};

export default connect(mapStateToProps, mapDispatchToProps)(MonitoringAppLogList);
